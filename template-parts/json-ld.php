<?php
function get_post_data() {
	global $post;

	return $post;
} // stuff for any page
$payload["@context"] = "http://schema.org/";
$post_data           = get_post_data();
$category            = get_the_category();
$bloginfo            = get_bloginfo();
$post_url            = get_permalink();
$logo                        = get_template_directory_uri() . "/assets/images/logo.png";
if ( is_singular( 'post' ) ) {
	$author_data                 = get_userdata( $post_data->post_author );
	$post_thumb                  = wp_get_attachment_url( get_post_thumbnail_id( $post->ID ) );
	$payload["@type"]            = "BlogPosting";
	$payload["url"]              = $post_url;
	$payload["author"]           = array(
		"@type" => "Person",
		"name"  => $author_data->display_name
	);
	$payload["headline"]         = $post_data->post_title;
	$payload["datePublished"]    = $post_data->post_date;
	$payload["dateModified"]     = $post_data->post_modified;
	$payload["image"]            = $post_thumb;
	$payload["genre"]            = $category[0]->cat_name;
	$payload["mainEntityOfPage"]    = array(
		"@type" => "WebPage",
         "@id" => $post_url
	);
	$payload["publisher"]        = array(
		"@type" => "Organization",
		"name"  => $site_name,
		"logo"  => $logo
	);
}
if ( is_front_page() ) {
	$payload["@type"]        = "Organization";
	$payload["name"]         = $site_name;
	$payload["logo"]         = $logo;
	$payload["url"]          = get_site_url() . "/";
	$payload["sameAs"]       = array(
		get_option( 'monolith_twitter' ),
		get_option( 'monolith_facebook' ),
		get_option( 'monolith_linkedin' ),
		get_option( 'monolith_googleplus' ),
		get_option( 'monolith_youtube' ),
		get_option( 'monolith_pinterest' ),
		get_option( 'monolith_instagram' )
	);
	$payload["contactPoint"] = array(
		array(
			"@type"       => "ContactPoint",
			"telephone"   => get_option( 'monolith_phone' ),
			"email"       => get_option( 'monolith_email' ),
			"contactType" => "customer services"
		)
	);
}
if ( is_author() ) { // this gets the data for the user who wrote that particular item
	$author_data       = get_userdata( $post_data->post_author );
	$payload["@type"]  = "Person";
	$payload["name"]   = $author_data->display_name;
	$payload["email"]  = $author_data->user_email;
	$payload["sameAs"] = array(
		get_option( 'monolith_twitter' ),
		get_option( 'monolith_facebook' ),
		get_option( 'monolith_linkedin' ),
		get_option( 'monolith_googleplus' ),
		get_option( 'monolith_youtube' ),
		get_option( 'monolith_pinterest' ),
		get_option( 'monolith_instagram' )
	);
}
if ( is_home() ) {
	$payload["publisher"] = array(
		"@type" => "Organization",
		"name"  => $site_name,
		"logo"  => $logo
	);
}


