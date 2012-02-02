from django.conf.urls.defaults import *

urlpatterns = patterns( 'databrowser.views',
    ( r'^$',               'app_page' ),

    ( r'^get_collections/$', 'get_collections' ),
    ( r'^get_init_data/$',   'get_init_data' ),
    ( r'^get_children/$',    'get_children' ),

    ( r'^store_state/$',     'store_state' ),
    ( r'^(?P<id>\d+)/$',     'init_restore' ),
    ( r'^restore_state/$',   'restore_state' ),

    ( r'^download/$',        'download_data' ),
    ( r'^feedback/$',        'feedback_email' ),

    ( r'^search_count/$',    'search_count' ),
    ( r'^search_data/$',     'search_data' ),
)
