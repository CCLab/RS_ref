import os
ROOT_PATH = os.path.dirname( __file__ )

DEBUG = True
TEMPLATE_DEBUG = DEBUG

DBCONF = os.path.join( ROOT_PATH, 'rs', 'rawsdata.conf' )

ADMINS = (
    ('alex', 'alex@centrumcyfrowe.pl'),
    ('', ''),
)
MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'sqlite3',
        'NAME': 'session.db',
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
    }
}

TIME_ZONE = 'Europe/Warsaw'
LANGUAGE_CODE = 'pl'

SITE_ID = 1

USE_I18N = True
USE_L10N = True

MEDIA_PREFIX = ''
MEDIA_ROOT = os.path.join( ROOT_PATH, 'site_media' )
MEDIA_URL = '/site_media/'
ADMIN_MEDIA_PREFIX = '/admin_media/'

SECRET_KEY = 'kr0PeoeoVZQ_ka62RyHErw=='

TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
)

ROOT_URLCONF = 'rawsalad.urls'

TEMPLATE_DIRS = (
    os.path.join( ROOT_PATH, 'templates' ),
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'rawsalad.databrowser',
    'rawsalad.papi',
    'rawsalad.uploader',
)

