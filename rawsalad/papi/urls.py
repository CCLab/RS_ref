from django.conf.urls.defaults import *

# URLs for search: temporary update by Denis Kolokol, marked with comment "DK"


urlpatterns = patterns( 'papi.papi',
    (r'^$', 'get_top_api' ),
    (r'^collections/$', 'get_dbtree' ),
    #(r'^collections/(?P<endpoint>[a-z_0-9]+)/tree/$', 'get_endpoint' ),
    (r'^collections/(?P<endpoint>[a-z_0-9]+)/meta/$', 'get_meta' ),

    (r'^collections/(?P<endpoint>[a-z_0-9]+)/(?P<id>\d+)/$', 'get_data' ),
    (r'^collections/(?P<endpoint>[a-z_0-9]+)/$', 'get_top_level' ),
    (r'^collections/(?P<endpoint>[a-z_0-9]+)/children/(?P<par_id>\d+)/$', 'get_children' ),

    (r'^search/count/(?P<endpoint>\w+)/(?P<query>\w+)/$', 'get_search_count'),
    (r'^search/data/(?P<endpoint>\w+)/(?P<query>\w+)/$', 'get_search_data'),

    (r'^help/$', 'help' ),
    (r'^.*/$', 'help' ),
)
