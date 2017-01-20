<?php
/**
 * Collection of shortcodes bundled with Monolith
 * @license MIT http://opensource.org/licenses/MIT
 * @package monolith
 */

/**
 * Intro text shortcode [intro]
 */
function intro_text_shortcode( $atts, $content = null ) {
	return '<div class="lead">' . apply_filters( 'the_content', $content ) . '</div>';
}

add_shortcode( 'intro', 'intro_text_shortcode' );

/**
 * HR shortcode [divider]
 */
function hr_shortcode( $atts, $content = null ) {
	return '<hr />';
}

add_shortcode( 'divider', 'hr_shortcode' ); // hr divider shortcode

/**
 * Callout shortcode [callout]
 */
function callout_shortcode( $atts, $content = null ) {
	extract( shortcode_atts( array(
		'type' => ''
	), $atts ) );


	return '<div class="shortcode-callout callout ' . $type . '">' . apply_filters( 'the_content', $content ) . '</div>';
}

add_shortcode( 'callout', 'callout_shortcode' );

/**
 * Renders Foundation buttons
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */
function buttons( $atts, $content = null ) {
	extract( shortcode_atts( array(
		'type'   => '', /* primary, default, info, success, danger, warning, inverse */
		'size'   => '', /* tiny, small, large */
		'pageid' => '',
		'url'    => '',
		'text'   => '',
	), $atts ) );

	$type = $type;

	if ( $size == "" ) {
		$size = "";
	} else {
		$size = $size;
	}

	if ( $pageid != '' ) {
		$url = get_permalink( $pageid );
	}

	$output = '<a href="' . $url . '" class="button ' . $type . ' ' . $size . '">';
	$output .= $text;
	$output .= '</a>';

	return $output;
}

add_shortcode( 'button', 'buttons' );

/**
 * Renders Foundation blockquotes
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */
function blockquotes( $atts, $content = null ) {
	extract( shortcode_atts( array(
		'cite' => '', /* text for cite */
	), $atts ) );

	$output = '<blockquote>';
	$output .= '<p>' . $content . '</p>';

	if ( $cite ) {
		$output .= '<cite>' . $cite . '</cite>';
	}

	$output .= '</blockquote>';

	return apply_filters( 'the_content', $output );
}

add_shortcode( 'blockquote', 'blockquotes' );

/**
 * Childpages shortcode renders a list of childpages 'list' 'grid' 'tabs' 'tabs-accordion' 'accordion' 'heading-accordion'=================================
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */
function childpages( $atts ) {

	// set defaults
	global $post;


	$params = shortcode_atts( array(
		'layout'        => 'snippets', // default layout
		'part'          => 'snippet',
		'id'            => $post->ID,
		'class'         => '',
		'size'          => '',
		'exclude_pages' => null,
		'image'         => true,
		'title'         => true,
		'linked'        => true,
		'excerpt'       => true,
		'readmore'      => true,
		'orderby'       => 'menu_order',
		'order'         => 'ASC'
	), $atts ); // TODO can we handle these defaults through the builder class instead?


	$args = array(
		'post_parent'    => $params['id'],
		'post_type'      => 'page',
		'order'          => 'ASC',
		'orderby'        => $params['orderby'],
		'posts_per_page' => - 1
	);

	// define our arguments for the builder based on whether we want to show images, titles, etc
	$builder_args                 = array();
	$builder_args['has_image']    = ( $params['image'] == 'false' ) ? false : true;
	$builder_args['has_title']    = ( $params['title'] == 'false' ) ? false : true;
	$builder_args['has_link']     = ( $params['linked'] == 'false' ) ? false : true;
	$builder_args['has_summary']  = ( $params['excerpt'] == 'false' ) ? false : true;
	$builder_args['has_readmore'] = ( $params['readmore'] == 'false' ) ? false : true;
	$builder_args['classes']      = implode( ' ', array( $params['class'], $params['size'] ) );

	if ( $params['exclude_pages'] ) {
		$args['post__not_in'] = explode( ',', $params['exclude_pages'] );
	}

	ob_start();
	monolith_build( array( 'layout' => $params['layout'], 'part' => $params['part'] ), $builder_args, $args );

	return ob_get_clean();
}

add_shortcode( 'childpages', 'childpages' );

//================================ end childpages shortcode stuff ====================================

function pages_shortcode( $atts, $content = null ) {

	extract( shortcode_atts( array( // set our defaults for the shortcode
		'layout'        => 'snippets', // default layout
		'part'          => 'snippet',
		'ids'           => '',
		'class'         => '',
		'size'          => '',
		'exclude_pages' => null,
		'image_border'  => 'false',
		'image'         => true,
		'title'         => true,
		'excerpt'       => true,
		'readmore'      => true,
		'orderby'       => 'menu_order',
		'order'         => 'ASC'

	), $atts ) );

	$page_ids = array();
	$page_ids = explode( ',', $atts['ids'] );

	// get the posts
	$args = array(
		'post__in'       => $page_ids,
		'post_type'      => 'page',
		'order'          => 'ASC',
		'orderby'        => 'menu_order',
		'posts_per_page' => - 1

	);

	// define our arguments for the builder based on whether we want to show images, titles, etc
	$builder_args                 = array();
	$builder_args['is_thumbnail'] = ( $image_border == 'false' ) ? false : true;
	$builder_args['has_image']    = ( $image == 'false' ) ? false : true;
	$builder_args['has_title']    = ( $title == 'false' ) ? false : true;
	$builder_args['has_summary']  = ( $excerpt == 'false' ) ? false : true;
	$builder_args['has_readmore'] = ( $readmore == 'false' ) ? false : true;
	$builder_args['orderby']      = $orderby;
	$builder_args['classes']      = $size;
	//$builder_args['size']         = $size;

	ob_start();
	monolith_build( array( 'layout' => $layout, 'part' => $part ), $builder_args, $args );

	return ob_get_clean();

}//end function
add_shortcode( 'pages', 'pages_shortcode' );


/**
 * Renders wrapper div to create different types of lists
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */

function list_shortcode( $atts, $content = null ) {
	extract( shortcode_atts( array(
		'type' => '', /* no-bullet, ticks, chevron etc */
	), $atts ) );


	$output = '<div class="styled-list ' . $type . '">';
	$output .= apply_filters( 'the_content', $content );
	$output .= '</div>';

	return $output;
}

add_shortcode( 'list', 'list_shortcode' );

/**
 * Renders accordion
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */
function monolith_foundation_accordion_shortcode( $atts, $content ) {

	extract( shortcode_atts( array( // set our defaults for the shortcode
		'class' => ''
	), $atts ) );

	$output = '<ul class="accordion ' . $class . '" data-accordion>';
	$output .= do_shortcode( $content );
	$output .= '</ul>';

	return apply_filters( 'the_content', $output );
}

add_shortcode( 'accordion', 'monolith_foundation_accordion_shortcode' );

function monolith_accordion_panel_shortcode( $atts, $content ) {

	extract( shortcode_atts( array( // set our defaults for the shortcode
		'title' => 'Please enter an accordion title',
		'class' => ''
	), $atts ) );

	$id = rand( 1, 1000 );

	$output = '<li class="accordion-item" data-accordion-item>';
	$output .= '<a href="#" class="accordion-title">' . $title . '</a>';
	$output .= '<div class="accordion-content" data-tab-content>';
	$output .= $content;
	$output .= '</div>';
	$output .= '</li>';

	return apply_filters( 'accordion_panel', $output );
}

add_shortcode( 'accordion_panel', 'monolith_accordion_panel_shortcode' );

/**
 * Foundation row [row]
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */
function foundation_row_shortcode( $atts, $content = null ) {
	return '<div class="row">' . apply_filters( 'the_content', $content ) . '</div>';
}

add_shortcode( 'row', 'foundation_row_shortcode' );

/**
 * Foundation columns [foundation_columns]
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */
function foundation_columns_shortcode( $atts, $content = null ) {
	extract( shortcode_atts( array(
		'columns' => '', /* large-12 small-5 etc */
	), $atts ) );

	$output = '<div class="columns ' . $columns . '">';
	$output .= apply_filters( 'the_content', $content );
	$output .= '</div>';

	return $output;
}

add_shortcode( 'foundation_columns', 'foundation_columns_shortcode' );

/**
 * Address [address]
 *
 * @param array $atts
 * @param string $content
 *
 * @return string
 */

function address_shortcode( $atts, $content = null ) {
	extract( shortcode_atts( array(
		'type' => 'horizontal', /* no-bullet inline-list */
	), $atts ) );

	ob_start();
	include( get_template_directory() . '/builder-parts/address.php' );

	return ob_get_clean();
}

add_shortcode( 'monolith_address', 'address_shortcode' );


/**
 * Stretch Band shortcode [stretch_band]
 */
function stretch_band_shortcode( $atts, $content = null ) {
	extract( shortcode_atts( array(
		'type' => ''
	), $atts ) );

	return '<div class="m3-shortcode stretch-band ' . $type . '"><div class="row"><div class="columns">' . apply_filters( 'the_content', $content ) . '</div></div></div>';
}

add_shortcode( 'stretch_band', 'stretch_band_shortcode' );

if ( ! function_exists( 'fresco_gallery_shortcode' ) ) {

	function fresco_gallery_shortcode( $attr ) {

		$post = get_post();

		static $instance = 0;
		$instance ++;

		if ( ! empty( $attr['ids'] ) ) {
			// 'ids' is explicitly ordered, unless you specify otherwise.
			if ( empty( $attr['orderby'] ) ) {
				$attr['orderby'] = 'post__in';
			}
			$attr['include'] = $attr['ids'];
		}

		// Allow plugins/themes to override the default gallery template.
		$output = apply_filters( 'post_gallery', '', $attr );
		if ( $output != '' ) {
			return $output;
		}

		// We're trusting author input, so let's at least make sure it looks like a valid orderby statement
		if ( isset( $attr['orderby'] ) ) {
			$attr['orderby'] = sanitize_sql_orderby( $attr['orderby'] );
			if ( ! $attr['orderby'] ) {
				unset( $attr['orderby'] );
			}
		}

		$gallery_defaults = array(
			'order'      => 'ASC',
			'orderby'    => 'menu_order ID',
			'id'         => $post ? $post->ID : 0,
			'itemtag'    => 'dl',
			'icontag'    => 'dt',
			'captiontag' => 'dd',
			'columns'    => 3,
			'size'       => 'thumbnail',
			'include'    => '',
			'exclude'    => ''
		);

		extract( shortcode_atts( $gallery_defaults, $attr, 'gallery' ) );

		$id = intval( $id );
		if ( 'RAND' == $order ) {
			$orderby = 'none';
		}

		if ( ! empty( $include ) ) {
			$_attachments = get_posts( array(
				'include'        => $include,
				'post_status'    => 'inherit',
				'post_type'      => 'attachment',
				'post_mime_type' => 'image',
				'order'          => $order,
				'orderby'        => $orderby
			) );

			$attachments = array();
			foreach ( $_attachments as $key => $val ) {
				$attachments[ $val->ID ] = $_attachments[ $key ];
			}
		} elseif ( ! empty( $exclude ) ) {
			$attachments = get_children( array(
				'post_parent'    => $id,
				'exclude'        => $exclude,
				'post_status'    => 'inherit',
				'post_type'      => 'attachment',
				'post_mime_type' => 'image',
				'order'          => $order,
				'orderby'        => $orderby
			) );
		} else {
			$attachments = get_children( array(
				'post_parent'    => $id,
				'post_status'    => 'inherit',
				'post_type'      => 'attachment',
				'post_mime_type' => 'image',
				'order'          => $order,
				'orderby'        => $orderby
			) );
		}

		if ( empty( $attachments ) ) {
			return '';
		}

		if ( is_feed() ) {
			$output = "\n";
			foreach ( $attachments as $att_id => $attachment ) {
				$output .= wp_get_attachment_link( $att_id, $size, true ) . "\n";
			}

			return $output;
		}

		$itemtag    = tag_escape( $itemtag );
		$captiontag = tag_escape( $captiontag );
		$icontag    = tag_escape( $icontag );
		$valid_tags = wp_kses_allowed_html( 'post' );
		if ( ! isset( $valid_tags[ $itemtag ] ) ) {
			$itemtag = 'dl';
		}
		if ( ! isset( $valid_tags[ $captiontag ] ) ) {
			$captiontag = 'dd';
		}
		if ( ! isset( $valid_tags[ $icontag ] ) ) {
			$icontag = 'dt';
		}

		$columns = intval( $columns );

		//Set bloch grid class based on columns
		switch ( $columns ) {
			case 1:
				$block_class = 'large-up-1 medium-up-1 small-up-1';
				break;
			case 2:
				$block_class = 'large-up-2 medium-up-1 small-up-1';
				break;
			case 3:
				$block_class = 'large-up-3 medium-up-1 small-up-1';
				break;
			case 4:
				$block_class = 'large-up-4 medium-up-2 small-up-1';
				break;
			case 5:
				$block_class = 'large-up-5 medium-up-2 small-up-1';
				break;
			case 6:
				$block_class = 'large-up-6 medium-up-3 small-up-1';
				break;
			default:
				$block_class = 'large-up-3 medium-up-2 small-up-1';
				break;
		}

		$gallery_container = "<div class=\"gallery row {$block_class}\">";

		$output = apply_filters( 'gallery_style', $gallery_container );

		$gallery_id = md5( implode( '', array_keys( $attachments ) ) );

		foreach ( $attachments as $id => $attachment ) {
			if ( ! empty( $attr['link'] ) && 'file' === $attr['link'] ) {
				$image_output = wp_get_attachment_link( $id, $size );
			} elseif ( ! empty( $attr['link'] ) && 'none' === $attr['link'] ) {
				$image_output = wp_get_attachment_image( $id, $size );
			} else {
				$image_output = wp_get_attachment_link( $id, $size, true );
			}

			$image_output = wp_get_attachment_link( $id, $size );

			$image_meta = wp_get_attachment_metadata( $id );

			//Cache image caption
			$caption_text = null;
			if ( trim( $attachment->post_excerpt ) ) {
				$caption_text = wptexturize( $attachment->post_excerpt );
			}

			// Prepare anchor attributes
			$image_anchor_attributes = array(
				'class="fresco"',
				'id="gallery-' . $id . '"',
				'data-fresco-group="gallery-' . $gallery_id . '"',
				'data-fresco-caption="' . $caption_text . '"'
			);

			$image_output = str_replace(
				'<a',
				'<a ' . implode( ' ', $image_anchor_attributes ),
				$image_output
			);

			ob_start();
			echo '<div class="column">' . $image_output . '</div>';
			$output .= ob_get_contents();
			ob_end_clean();
		}

		$output .= "</div>";

		// Gallery good to go - include
		wp_enqueue_style( 'fresco', get_template_directory_uri() . '/assets/lib/fresco-2.2.2/css/fresco/fresco.css' );
		wp_enqueue_script( 'fresco', get_template_directory_uri() . '/assets/lib/fresco-2.2.2/js/fresco/fresco.js', array( 'jquery' ), false, true );

		return $output;
	}
}

remove_shortcode( 'gallery' );
add_shortcode( 'gallery', 'fresco_gallery_shortcode' );
