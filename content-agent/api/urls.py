from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.register, name='signup'),
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('me/', views.me, name='me'),
    path('generate/', views.generate_post, name='generate_post'),
    path('history/', views.history, name='history'),
]
