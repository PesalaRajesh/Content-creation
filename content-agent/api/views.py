import os

from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .ai_logic import generate_linkedin_post
from .models import Customer, GeneratedPost

TRIAL_LIMIT = int(os.getenv('TRIAL_LIMIT', 5))


def normalize_email(email):
    return email.strip().lower() if email else ''


def validate_email_address(email):
    if not email:
        raise ValueError('Email is required.')

    try:
        validate_email(email)
    except ValidationError:
        raise ValueError('Invalid email format.')

    return email


def get_or_create_customer_for_user(user):
    try:
        return Customer.objects.get(user=user)
    except Customer.DoesNotExist:
        customer, created = Customer.objects.get_or_create(
            email=user.email,
            defaults={
                'user': user,
                'trial_limit': TRIAL_LIMIT,
            },
        )
        if customer.user is None:
            customer.user = user
            customer.save(update_fields=['user'])
        return customer


def get_or_create_customer_by_email(email):
    return Customer.objects.get_or_create(email=email, defaults={'trial_limit': TRIAL_LIMIT})[0]


def build_customer_payload(customer):
    if not customer:
        return None

    return {
        'email': customer.email,
        'trial_uses': customer.trial_uses,
        'trial_limit': customer.trial_limit,
        'remaining_trial': customer.remaining_trial(),
    }


@api_view(['POST'])
def register(request):
    email = normalize_email(request.data.get('email', ''))
    password = request.data.get('password', '')

    if not email:
        return Response({'error': 'You must provide an email address.'}, status=400)
    if not password:
        return Response({'error': 'You must provide a password.'}, status=400)

    try:
        validate_email_address(email)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'An account with that email already exists.'}, status=400)

    user = User.objects.create_user(username=email, email=email, password=password)
    customer = get_or_create_customer_for_user(user)
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        'token': token.key,
        'customer': build_customer_payload(customer),
    })


@api_view(['POST'])
def login(request):
    email = normalize_email(request.data.get('email', ''))
    password = request.data.get('password', '')

    if not email or not password:
        return Response({'error': 'You must provide both email and password.'}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({'error': 'Invalid email or password.'}, status=401)

    auth_login(request, user)
    token, _ = Token.objects.get_or_create(user=user)
    customer = get_or_create_customer_for_user(user)

    return Response({
        'token': token.key,
        'customer': build_customer_payload(customer),
    })


@api_view(['POST'])
def logout(request):
    if request.user.is_authenticated:
        Token.objects.filter(user=request.user).delete()
        auth_logout(request)
        return Response({'message': 'Logged out successfully.'})

    return Response({'message': 'No active session.'})


@api_view(['GET'])
def me(request):
    if not request.user.is_authenticated:
        return Response({'authenticated': False}, status=401)

    customer = get_or_create_customer_for_user(request.user)
    return Response({
        'authenticated': True,
        'email': request.user.email,
        'customer': build_customer_payload(customer),
    })


@api_view(['GET', 'DELETE'])
def history(request):
    if request.user.is_authenticated:
        customer = get_or_create_customer_for_user(request.user)
    else:
        email = normalize_email(request.query_params.get('email', ''))
        try:
            validate_email_address(email)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)

        try:
            customer = Customer.objects.get(email=email)
        except Customer.DoesNotExist:
            return Response(
                {'error': 'No account found for that email.', 'history': [], 'customer': None},
                status=404,
            )

    if request.method == 'DELETE':
        GeneratedPost.objects.filter(customer=customer).delete()
        return Response({'message': 'History cleared.'})

    posts = GeneratedPost.objects.filter(customer=customer).order_by('-created_at')[:20]
    history_data = [
        {
            'id': post.id,
            'transcript': post.transcript,
            'template': post.template,
            'tone': post.tone,
            'post': post.post,
            'created_at': post.created_at.isoformat(),
            'templateLabel': post.template.replace('_', ' ').replace('-', ' ').replace('standard', 'Standard LinkedIn Post'),
            'toneLabel': post.tone.replace('_', ' ').replace('-', ' ').title(),
        }
        for post in posts
    ]

    return Response({'history': history_data, 'customer': build_customer_payload(customer)})


@api_view(['POST'])
def generate_post(request):
    transcript = request.data.get('transcript', '')
    template = request.data.get('template', 'standard')
    tone = request.data.get('tone', 'professional')
    email = normalize_email(request.data.get('email', ''))
    customer = None

    if request.user.is_authenticated:
        customer = get_or_create_customer_for_user(request.user)
    elif email:
        try:
            validate_email_address(email)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)

        customer = get_or_create_customer_by_email(email)

    if not transcript or not str(transcript).strip():
        return Response({'error': 'Transcript is required'}, status=400)

    if customer and customer.remaining_trial() <= 0:
        return Response(
            {
                'error': 'Your free trial has ended. Please upgrade to continue.',
                'customer': build_customer_payload(customer),
            },
            status=403,
        )

    try:
        post = generate_linkedin_post(transcript, template=template, tone=tone)

        if customer:
            GeneratedPost.objects.create(
                customer=customer,
                transcript=transcript,
                template=template,
                tone=tone,
                post=post,
            )
            customer.trial_uses += 1
            customer.save(update_fields=['trial_uses'])

        return Response(
            {
                'post': post,
                'customer': build_customer_payload(customer) if customer else None,
            }
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=500)
    except Exception as exc:
        return Response({'error': f'Unexpected error: {exc}'}, status=500)
