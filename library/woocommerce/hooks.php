<?php
/**
 * Date: 20/01/2017
 * Time: 15:13
 */

remove_action( 'admin_notices', 'woothemes_updater_notice' );

//-----------------------------------------------------------
// BEGIN WOOCOMMERCE INIT
// (see: https://docs.woocommerce.com/document/third-party-custom-theme-compatibility/)
//-----------------------------------------------------------
remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );

add_action( 'woocommerce_before_main_content', function () {
	echo '<section id="main">';
} );
add_action( 'woocommerce_after_main_content', function () {
	echo '</section>';
}, 10 );

add_action( 'after_setup_theme', function () {
	add_theme_support( 'woocommerce' );
} );

// Remove each style one by one
add_filter( 'woocommerce_enqueue_styles', 'jk_dequeue_styles' );
function jk_dequeue_styles( $enqueue_styles ) {
	unset( $enqueue_styles['woocommerce-general'] );        // Remove the gloss
	unset( $enqueue_styles['woocommerce-layout'] );         // Remove the layout
	unset( $enqueue_styles['woocommerce-smallscreen'] );    // Remove the smallscreen optimisation
	return $enqueue_styles;
}

// Or just remove them all in one line
add_filter( 'woocommerce_enqueue_styles', '__return_false' );

//-----------------------------------------------------------
// END WOOCOMMERCE INIT
//-----------------------------------------------------------
