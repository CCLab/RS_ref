from django.conf.urls.defaults import *

urlpatterns = patterns( 'uploader.views',
    ( r'^$',               'login' ),
    ( r'^bad_login/$',     'bad_login' ),
    ( r'^try_login/$',     'try_login' ),
    ( r'^collection/$',    'choose_collection' ),
)

