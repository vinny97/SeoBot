# Searchhand agent status

The homepage radar is a projection of stored work, not animation-only decoration.

`deriveAgentStatus` applies this precedence:

1. failed website/GSC state → `error`
2. active crawl or page analysis → `analysing_website`
3. active GSC import → `syncing_search_data`
4. active recommendation job → `comparing_opportunities`
5. approved/completed measured work → `measuring`
6. best recommendation awaiting a decision → `waiting_for_user`
7. connected search data without a recommendation → `preparing_recommendation`
8. otherwise → `idle`

Home shows one best action only. Radar markers come from that recommendation; counters come from crawl pages, measured recommendation records and activities. The progress row derives website-understood, search-imported, opportunities-compared and recommendation-ready states from page intelligence, GSC sync and recommendations.

Activities include pages analysed, Search Console connected, search data imported, recommendation generated/best action selected, and recommendation decisions. No OAuth token or provider payload is logged.

The floating dock exposes Home, Work, Website, Results, Connections and Settings with tooltips, accessible names and selected state. Motion remains controlled by the existing reduced-motion CSS behavior.
