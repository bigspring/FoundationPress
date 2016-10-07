<?php
/**
 * Author: Ole Fredrik Lie
 * URL: http://olefredrik.com
 *
 * FoundationPress functions and definitions
 *
 * Set up the theme and provides some helper functions, which are used in the
 * theme as custom template tags. Others are attached to action and filter
 * hooks in WordPress to change core functionality.
 *
 * @link https://codex.wordpress.org/Theme_Development
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

/** Various clean up functions */
require_once( 'library/cleanup.php' );

/** Required for Foundation to work properly */
require_once( 'library/foundation.php' );

/** Register all navigation menus */
require_once( 'library/navigation.php' );

/** Add menu walkers for top-bar and off-canvas */
require_once( 'library/menu-walkers.php' );

/** Create widget areas in sidebar and footer */
require_once( 'library/widget-areas.php' );

/** Return entry meta information for posts */
require_once( 'library/entry-meta.php' );

/** Enqueue scripts */
require_once( 'library/enqueue-scripts.php' );

/** Add theme support */
require_once( 'library/theme-support.php' );

/** Add Nav Options to Customer */
require_once( 'library/custom-nav.php' );

/** Change WP's sticky post class */
require_once( 'library/sticky-posts.php' );

/** Configure responsive image sizes */
require_once( 'library/responsive-images.php' );

/** load the builder functions */
require_once( 'library/builder.php' );
require_once( 'library/builder-functions.php' );

/** load the shortcodes */
require_once( 'library/shortcodes.php' );


/** If your site requires protocol relative url's for theme assets, uncomment the line below */
// require_once( 'library/protocol-relative-theme-assets.php' );

/**
 * Featured image sizes
 */

set_post_thumbnail_size( 640, 360, true );
add_image_size( 'square', 640, 640, true );
add_image_size( 'small-square', 320, 320, true );
add_image_size( 'small-landscape', 640, 360, true );
add_image_size( 'landscape', 970, 546, true );
add_image_size( 'portrait', 600, 840, true );

// Add new image sizes to attachment settings size dropdown
$img_config['imgSize']['newthumbnail'] = array('width'=>200,  'height'=>200);

function monolith_change_image_size_array($sizes) {
	global $img_config;

	$img_config['selectableImgSize'] = array(
	'square' 				=> __('Square','monolith'),
	'small-square' 			=> __('Small Square','monolith_framework'),
	'landscape'  			=> __('Landscape','monolith_framework'),
	'small-landscape'  		=> __('Small Landscape','monolith_framework'),
	'portrait'  		=> __('Portrait','monolith_framework'),
	);

	$sizes = array_merge($sizes, $img_config['selectableImgSize']);

	return $sizes;
}
add_filter( 'image_size_names_choose', 'monolith_change_image_size_array', 10, 1);