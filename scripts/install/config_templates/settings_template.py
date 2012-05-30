import os
ROOT_PATH = os.path.dirname( __file__ )

DEBUG = False
TEMPLATE_DEBUG = DEBUG

DBCONF = os.path.join( ROOT_PATH, 'rs', 'rawsdata.conf' )

ADMINS = (
    $admins
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

TIME_ZONE = $time_zoe
LANGUAGE_CODE = $language_code

SITE_ID = 1

USE_I18N = True
USE_L10N = True

MEDIA_PREFIX = ''
MEDIA_ROOT = os.path.join( ROOT_PATH, '$media_dir' )
MEDIA_URL = '$host_addr/$media_dir/'
ADMIN_MEDIA_PREFIX = '/admin_media/'

SECRET_KEY = '$secret_key'

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

