#!/bin/sh

# central budget
curl -XGET http://otwartedane.pl/api/json/dataset/0/view/0/issue/2011/ > 0_0_2011.json

curl -XGET http://otwartedane.pl/api/json/dataset/0/view/1/issue/2011/ > 0_1_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/0/view/1/issue/2012/ > 0_1_2012.json

curl -XGET http://otwartedane.pl/api/json/dataset/0/view/2/issue/2011/ > 0_2_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/0/view/2/issue/2012/ > 0_2_2012.json

curl -XGET http://otwartedane.pl/api/json/dataset/0/view/3/issue/2010/ > 0_3_2010.json

# eu budget
curl -XGET http://otwartedane.pl/api/json/dataset/1/view/0/issue/2011/ > 1_0_2011.json

curl -XGET http://otwartedane.pl/api/json/dataset/1/view/1/issue/2011/ > 1_1_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/1/view/1/issue/2012/ > 1_1_2012.json

curl -XGET http://otwartedane.pl/api/json/dataset/1/view/2/issue/2011/ > 1_2_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/1/view/2/issue/2012/ > 1_2_2012.json

# national agencies and funds
curl -XGET http://otwartedane.pl/api/json/dataset/2/view/0/issue/2011/ > 2_0_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/2/view/1/issue/2011/ > 2_1_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/2/view/2/issue/2011/ > 2_2_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/2/view/3/issue/2011/ > 2_3_2011.json

# NFZ
curl -XGET http://otwartedane.pl/api/json/dataset/3/view/0/issue/2011/ > 3_0_2011.json
curl -XGET http://otwartedane.pl/api/json/dataset/3/view/1/issue/2011/ > 3_1_2011.json

# EFRR
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/0/issue/2007/ > 4_0_2007.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/0/issue/2008/ > 4_0_2008.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/0/issue/2009/ > 4_0_2009.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/0/issue/2010/ > 4_0_2010.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/0/issue/2011/ > 4_0_2011.json

curl -XGET http://otwartedane.pl/api/json/dataset/4/view/1/issue/2007/ > 4_1_2007.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/1/issue/2008/ > 4_1_2008.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/1/issue/2009/ > 4_1_2009.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/1/issue/2010/ > 4_1_2010.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/1/issue/2011/ > 4_1_2011.json

curl -XGET http://otwartedane.pl/api/json/dataset/4/view/2/issue/2008/ > 4_2_2008.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/2/issue/2009/ > 4_2_2009.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/2/issue/2010/ > 4_2_2010.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/2/issue/2011/ > 4_2_2011.json

curl -XGET http://otwartedane.pl/api/json/dataset/4/view/3/issue/2008/ > 4_3_2008.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/3/issue/2009/ > 4_3_2009.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/3/issue/2010/ > 4_3_2010.json
curl -XGET http://otwartedane.pl/api/json/dataset/4/view/3/issue/2011/ > 4_3_2011.json
