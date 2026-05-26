from django.contrib.auth.models import User
from django.db import models


class Customer(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer',
        null=True,
        blank=True,
    )
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    trial_uses = models.IntegerField(default=0)
    trial_limit = models.IntegerField(default=5)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    def remaining_trial(self):
        return max(0, self.trial_limit - self.trial_uses)


class GeneratedPost(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='generated_posts',
    )
    transcript = models.TextField()
    template = models.CharField(max_length=50, default='standard')
    tone = models.CharField(max_length=50, default='professional')
    post = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        owner = self.customer.email if self.customer else 'anonymous'
        return f'Post by {owner} at {self.created_at:%Y-%m-%d %H:%M:%S}'
