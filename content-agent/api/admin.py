from django.contrib import admin

from .models import Customer, GeneratedPost


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['email', 'trial_uses', 'trial_limit', 'created_at']
    readonly_fields = ['created_at']
    search_fields = ['email']


@admin.register(GeneratedPost)
class GeneratedPostAdmin(admin.ModelAdmin):
    list_display = ['customer', 'template', 'tone', 'created_at']
    list_filter = ['template', 'tone', 'created_at']
    search_fields = ['customer__email', 'post']
