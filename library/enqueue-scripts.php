<?php
/**
 * Enqueue all styles and scripts
 *
 * Learn more about enqueue_script: {@link https://codex.wordpress.org/Function_Reference/wp_enqueue_script}
 * Learn more about enqueue_style: {@link https://codex.wordpress.org/Function_Reference/wp_enqueue_style }
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

if ( ! function_exists( 'foundationpress_scripts' ) ) :
	function foundationpress_scripts() {

	// Enqueue the main Stylesheet.
	wp_enqueue_style( 'main-stylesheet', get_template_directory_uri() . '/assets/stylesheets/foundation.css', array(), '2.9.0', 'all' );

	// Deregister the jquery version bundled with WordPress.
	wp_deregister_script( 'jquery' );

	// CDN hosted jQuery placed in the header, as some plugins require that jQuery is loaded in the header.
	wp_enqueue_script( 'jquery', '//ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js', array(), '2.1.0', false );

	// If you'd like to cherry-pick the foundation components you need in your project, head over to gulpfile.js and see lines 35-54.
	// It's a good idea to do this, performance-wise. No need to load everything if you're just going to use the grid anyway, you know :)
	wp_enqueue_script( 'foundation', get_template_directory_uri() . '/assets/javascript/foundation.js', array('jquery'), '2.9.0', true );

	// Add the comment-reply library on pages where it is necessary
	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}

	}

	add_action( 'wp_enqueue_scripts', 'foundationpress_scripts' );
endif;

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
		$plugin_array['my_mce_button'] = get_template_directory_uri() . '/assets/javascript/m3-custom/mce-button.js';

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
