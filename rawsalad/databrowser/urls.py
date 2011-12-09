from django.conf.urls.defaults import *

urlpatterns = patterns( 'databrowser.views',
    ( r'^$',               'app_page' ),

    ( r'^get_init_data/$', 'get_init_data' ),
    ( r'^get_children/$',  'get_children' ),

    ( r'^store_state/$',   'store_state' ),
    ( r'^(?P<idef>\d+)/$', 'init_restore' ),
    ( r'^restore_state/$', 'restore_state' ),

    # TODO this url is probably not used
    ( r'^prepare_data/$',  'prepare_data' ),
    ( r'^download/$',      'download_data' ),
    ( r'^feedback/$',      'feedback_email' ),

    ( r'^search/$',        'search_data' ),
    ( r'^get_searched/$',  'get_searched_data' ),
)
