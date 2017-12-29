<?php
/**
 * Collection of functions to handle all hooks required for Monolith
 * @license MIT http://opensource.org/licenses/MIT
 * @package monolith
 */

if ( ! function_exists( 'login_css' ) ) {
	/**
	 * Custom WordPress Login styling, use the login.css to style the WP login page with site logo etc...
	 * @return void
	 */
	function login_css() {
		wp_enqueue_style( 'login_css', get_template_directory_uri() . '/src/assets/stylesheets/login.css' );
	}
	
	add_action( 'login_head', 'login_css' );
}

if ( ! function_exists( 'wpb_imagelink_setup' ) ) {
	/**
	 * Stop WP from automatically linking images to themselves
	 * @return void
	 */
	function wpb_imagelink_setup() {
		$image_set = get_option( 'image_default_link_type' );
		
		if ( $image_set !== 'none' ) {
			update_option( 'image_default_link_type', 'none' );
		}
	}
	
	add_action( 'admin_init', 'wpb_imagelink_setup', 10 );
}

if ( ! function_exists( 'get_address' ) ) {
	/**
	 * Returns the address set in Monolith Contact Settings
	 *
	 * @param array|null $details
	 *
	 * @return array
	 */
	function get_address( $details = null ) {
		if ( ! $details ) {
			$details = array(
				'address_1',
				'address_2',
				'address_3',
				'city',
				'county',
				'country',
				'postcode'
			);
		}
		
		foreach ( $details as &$detail ) {
			if ( get_option( 'monolith_' . $detail ) ) {
				$detail = get_option( 'monolith_' . $detail );
			} else {
				unset( $detail );
			}
		}
		
		return array_values( $details );
	}
}

/**
 * Display excerpt by default
 */
add_filter( 'default_hidden_meta_boxes', function ( $hidden, $screen ) {
	if ( 'post' == $screen->base || 'page' == $screen->base ) {
		$hidden = array(
			'slugdiv',
			'trackbacksdiv',
			'postcustom',
			'commentstatusdiv',
			'commentsdiv',
			'authordiv',
			'revisionsdiv'
		);
	}
	
	// removed 'postcustom',
	return $hidden;
}, 10, 2 );

// create custom gravity forms error message
add_filter( 'gform_validation_message', function ( $message, $form ) {
	return "<div class='validation_error'>" . __( 'Sorry, there was a problem with the form.  Check the fields and try again.', 'monolith' ) . '</div>';
}, 10, 2 );

/**
 * Add browserSync code before closing body tag
 */
add_action( 'wp_footer', function () {

	if ( ! defined( 'ENVIRONMENT' ) || ENVIRONMENT !== 'development' ) {
		return false;
	}
	
	echo "<script id=\"__bs_script__\">//<![CDATA[
		document.write(\"<script async src='http://HOST:3000/browser-sync/browser-sync-client.js?v=2.18.2'><\/script>\".replace(\"HOST\", location.hostname));
		//]]></script>";
}, 99 );

/**
 * Add schema for main navigation links @TODO this needs looking into, it works for the header navigation but causes errors on the footer navigation
 */
//add_filter( 'nav_menu_link_attributes', 'add_attribute', 10, 3 );
//function add_attribute( $atts, $item, $args ) {
//	$atts['itemprop'] = 'url';
//
//	return $atts;
//}

/**
 * Enqueue the JS utility for handling media uploads in Monolith settings.
 */
function m3_enqueue_media_uploader() {
	$current_screen = get_current_screen();
	$screen_bases   = array( 'settings_page_monolith_blog_settings', 'settings_page_monolith_archive_settings' );
	if ( in_array( $current_screen->base, $screen_bases ) ) {
		wp_enqueue_media();
		wp_register_script(
			'm3-media-upload',
			get_template_directory_uri() . '/src/assets/js/m3-custom/media-upload.js',
			array( 'jquery' )
		);
		wp_enqueue_script( 'm3-media-upload' );
	}
}

add_action( 'admin_enqueue_scripts', 'm3_enqueue_media_uploader' );

// ---------------------------
// M3 custom enqueued scripts
// ---------------------------

// Add a tinyMCE button
if ( ! function_exists( 'my_add_mce_button' ) ) {
	/**
	 * Hooks your functions into the correct filters
	 * @return array
	 */

	// Hooks your functions into the correct filters
	function my_add_mce_button() {
		// check user permissions
		if ( ! current_user_can( 'edit_posts' ) && ! current_user_can( 'edit_pages' ) ) {
			return;
		}
		// check if WYSIWYG is enabled
		if ( 'true' === get_user_option( 'rich_editing' ) ) {
			add_filter( 'mce_external_plugins', 'my_add_tinymce_plugin' );
			add_filter( 'mce_buttons', 'my_register_mce_button' );
		}
	}

	add_action( 'admin_head', 'my_add_mce_button' );
}

if ( ! function_exists( 'my_add_tinymce_plugin' ) ) {
	/**
	 * Register new button in the editor
	 * @return array
	 */

	// Declare script for new button
	function my_add_tinymce_plugin( $plugin_array ) {
		$plugin_array['my_mce_button'] = get_template_directory_uri() . '/src/assets/js/m3-custom/mce-button.js';

		return $plugin_array;
	}
}

if ( ! function_exists( 'my_register_mce_button' ) ) {
	/**
	 * Register new button in the editor
	 * @return array
	 */
	function my_register_mce_button( $buttons ) {
		array_push( $buttons, 'my_mce_button' );

		return $buttons;
	}
}

// Add support for excerpts on pages
// ---------------------------------
add_post_type_support( 'page', 'excerpt' );
