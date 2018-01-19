<?php
/**
 * Configure responsive images sizes
 *
 * @package WordPress
 * @subpackage FoundationPress
 * @since FoundationPress 2.6.0
 */

// Add featured image sizes
//
// Sizes are optimized and cropped for landscape aspect ratio
// and optimized for HiDPI displays on 'small' and 'medium' screen sizes.

// Define sizes
$small   = 320;
$medium  = 640;
$large = 1024;
$xlarge  = 1440;
//$xxlarge = 1920;

// Square images
add_image_size( 'square-small', $small, $small, true );
add_image_size( 'square-medium', $medium, $medium, true ); // name, width, height, crop
add_image_size( 'square-large', $large, $large, true );
//add_image_size( 'square-xlarge', $xlarge, $xlarge, true );
//add_image_size( 'square-xxlarge', $xxlarge, $xxlarge, true );

// Constrain by width
//add_image_size( 'fp-tiny', $small );
//add_image_size( 'fp-small', $medium );
//add_image_size( 'fp-medium', $large );
//add_image_size( 'fp-large', $xlarge );
//add_image_size( 'fp-xlarge', $xxlarge );

// Simon's special portrait magic
add_image_size( 'portrait-small', 300, 400, true );
add_image_size( 'portrait-medium', 600, 800, true );
add_image_size( 'portrait-large', 900, 1200, true );
//add_image_size( 'portrait-xlarge', 1200, 1600, true );

// Register the new image sizes for use in the add media modal in wp-admin
function foundationpress_custom_sizes( $sizes ) {
	return array_merge( $sizes, array(
		'portrait-small'  => __( 'Portrait Small' ),
		'portrait-medium' => __( 'Portrait Medium' ),
		'portrait-large'  => __( 'Portrait Large' ),
//		'portrait-xlarge'  => __( 'Portrait XLarge' ),
//		'portrait-xxlarge'  => __( 'Portrait XXLarge' ),
		'square-small'    => __( 'SQ Small' ),
		'square-medium'   => __( 'SQ Medium' ),
		'square-large'    => __( 'SQ Large' ),
//		'square-xlarge'   => __( 'SQ XLarge' ),
//		'square-xxlarge'   => __( 'SQ XXLarge' ),
//		'fp-small'        => __( 'FP Small' ),
//		'fp-medium'       => __( 'FP Medium' ),
//		'fp-large'        => __( 'FP Large' ),
//		'fp-xlarge'       => __( 'FP XLarge' ),
//		'fp-xxlarge'       => __( 'FP XXLarge' )
	) );
}

add_filter( 'image_size_names_choose', 'foundationpress_custom_sizes' );


// Add custom image sizes attribute to enhance responsive image functionality for content images
function foundationpress_adjust_image_sizes_attr( $sizes, $size ) {

	// Actual width of image
	$width = $size[0];

	// Full width page template
	if ( is_page_template( 'page-templates/page-full-width.php' ) ) {
		if ( 1200 < $width ) {
			$sizes = '(max-width: 1199px) 98vw, 1200px';
		} else {
			$sizes = '(max-width: 1199px) 98vw, ' . $width . 'px';
		}
	} else { // Default 3/4 column post/page layout
		if ( 770 < $width ) {
			$sizes = '(max-width: 639px) 98vw, (max-width: 1199px) 64vw, 770px';
		} else {
			$sizes = '(max-width: 639px) 98vw, (max-width: 1199px) 64vw, ' . $width . 'px';
		}
	}

	return $sizes;
}

add_filter( 'wp_calculate_image_sizes', 'foundationpress_adjust_image_sizes_attr', 10, 2 );

// Remove inline width and height attributes for post thumbnails
function remove_thumbnail_dimensions( $html, $post_id, $post_image_id ) {
	$html = preg_replace( '/(width|height)=\"\d*\"\s/', '', $html );

	return $html;
}

add_filter( 'post_thumbnail_html', 'remove_thumbnail_dimensions', 10, 3 );
