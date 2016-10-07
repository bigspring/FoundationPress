<?php
/**
 * Collection of shortcodes bundled with Monolith
 * @license MIT http://opensource.org/licenses/MIT
 * @package monolith
 */

/**
 * Intro text shortcode [intro]
 */
function intro_text_shortcode($atts, $content = null)
{
	return '<div class="lead">'.apply_filters('the_content', $content).'</div>';
}
add_shortcode('intro', 'intro_text_shortcode');

/**
 * HR shortcode [divider]
 */
function hr_shortcode($atts, $content = null)
{
	return '<hr />';
}
add_shortcode('divider', 'hr_shortcode'); // hr divider shortcode

/**
 * Callout shortcode [callout]
 */
function callout_shortcode($atts, $content = null) {
	extract( shortcode_atts( array(
			'type' => ''
	), $atts ) );


	return '<div class="shortcode-callout callout '. $type .'">'.apply_filters('the_content', $content).'</div>';
}
add_shortcode('callout', 'callout_shortcode');

/**
 * Renders Foundation buttons
 * @param array $atts
 * @param string $content
 * @return string
 */
function buttons( $atts, $content = null ) {
	extract( shortcode_atts( array(
			'type' => '', /* primary, default, info, success, danger, warning, inverse */
			'size' => '', /* tiny, small, large */
			'pageid' => '',
			'url'  => '',
			'text' => '',
	), $atts ) );

	$type = $type;

	if($size == ""){
		$size = "";
	}
	else{
		$size = $size;
	}

	if($pageid != '')
		$url = get_permalink($pageid);

	$output = '<a href="' . $url . '" class="button '. $type . ' ' . $size . '">';
	$output .= $text;
	$output .= '</a>';

	return $output;
}
add_shortcode('button', 'buttons');

/**
 * Renders Foundation blockquotes
 * @param array $atts
 * @param string $content
 * @return string
 */
function blockquotes( $atts, $content = null )
{
	extract( shortcode_atts( array(
			'cite' => '', /* text for cite */
	), $atts ) );

	$output = '<blockquote>';
	$output .= '<p>' . $content . '</p>';

	if($cite){
		$output .= '<cite>' . $cite . '</cite>';
	}

	$output .= '</blockquote>';

	return apply_filters('the_content', $output);
}
add_shortcode('blockquote', 'blockquotes');

/**
 * Childpages shortcode renders a list of childpages 'list' 'grid' 'tabs' 'tabs-accordion' 'accordion' 'heading-accordion'=================================
 * @param array $atts
 * @param string $content
 * @return string
 */
function childpages($atts, $content = null)
{
	// set defaults
	global $post;
    extract( shortcode_atts( array( // set our defaults for the shortcode
        'layout' => 'list', // default layout
        'id' => $post->ID,
        'class' => '',
        'size' => '',
        'exclude_pages' => null,
        'image' => true,
        'title' => true,
        'linked' => true,
        'excerpt' => true,
        'readmore' => true,
        'orderby' => 'menu_order',
        'order' => 'ASC'
    ), $atts ) ); // @TODO can we handle these defaults through the builder class instead?

	$args = array(
			'post_parent' => $id,
			'post_type' => 'page',
			'order' => 'ASC',
			'orderby' => $orderby,
			'posts_per_page' => -1
	);

    // define our arguments for the builder based on whether we want to show images, titles, etc
    $builder_args = array();
    $builder_args['has_image'] = ($image == 'false') ? false : true;
    $builder_args['has_title'] = ($title == 'false') ? false : true;
    $builder_args['has_link'] = ($linked == 'false') ? false : true;
    $builder_args['has_summary'] = ($excerpt == 'false') ? false : true;
    $builder_args['has_readmore'] = ($readmore == 'false') ? false : true;
    $builder_args['classes'] = $class;
    $builder_args['size'] = $size;


    if($exclude_pages) {
        $args['post__not_in'] = explode(',', $exclude_pages);
    }

	ob_start();
    monolith_build($layout, $builder_args, $args);
	return ob_get_clean();
}
add_shortcode('childpages', 'childpages');

//================================ end childpages shortcode stuff ====================================

function pages_shortcode($atts, $content = null) {

    extract( shortcode_atts( array( // set our defaults for the shortcode
        'layout' => 'list', // default layout
        'ids' => '',
        'class' => '',
        'size' => '',
        'exclude_pages' => null,
        'image_border' => 'false',
        'image' => true,
        'title' => true,
        'excerpt' => true,
        'readmore' => true,
        'orderby' => 'menu_order',
        'order' => 'ASC'

    ), $atts ) );

    $page_ids = array();
    $page_ids = explode(',', $atts['ids']);

    // get the posts
    $args = array(
        'post__in' => $page_ids,
        'post_type' => 'page',
        'order' => 'ASC',
        'orderby' => 'menu_order',
        'posts_per_page' => -1

    );

    // define our arguments for the builder based on whether we want to show images, titles, etc
    $builder_args = array();
    $builder_args['is_thumbnail'] = ($image_border == 'false') ? false : true;
    $builder_args['has_image'] = ($image == 'false') ? false : true;
    $builder_args['has_title'] = ($title == 'false') ? false : true;
    $builder_args['has_summary'] = ($excerpt == 'false') ? false : true;
    $builder_args['has_readmore'] = ($readmore == 'false') ? false : true;
    $builder_args['orderby'] = $orderby;
    $builder_args['classes'] = $class;
    $builder_args['size'] = $size;

    ob_start();
    monolith_build($layout, $builder_args, $args);
    return ob_get_clean();

}//end function
add_shortcode('pages', 'pages_shortcode');


/**
 * Renders wrapper div to create different types of lists
 * @param array $atts
 * @param string $content
 * @return string
 */

function list_shortcode( $atts, $content = null ) {
	extract( shortcode_atts( array(
			'type' => '', /* no-bullet, ticks, chevron etc */
	), $atts ) );


	$output = '<div class="styled-list '. $type . '">';
	$output .= apply_filters('the_content', $content);
	$output .= '</div>';

	return $output;
}
add_shortcode('list', 'list_shortcode');

/**
 * Renders accordion
 * @param array $atts
 * @param string $content
 * @return string
 */
function monolith_foundation_accordion_shortcode($atts, $content) {

    extract( shortcode_atts( array( // set our defaults for the shortcode
        'class' => ''
    ), $atts ) );

    $output = '<dl class="accordion '.$class.'" data-accordion role="tablist">';
    $output .= do_shortcode($content);
    $output .= '</dl>';

    return apply_filters('the_content', $output);
}
add_shortcode('accordion', 'monolith_foundation_accordion_shortcode');

function monolith_accordion_panel_shortcode($atts, $content) {

    extract( shortcode_atts( array( // set our defaults for the shortcode
        'title' => 'Please enter an accordion title',
        'class' => ''
    ), $atts ) );

    $id = rand(1, 1000);

    $output = '<dd class="accordion-navigation '.$class.'">';
    $output .= '<a href="#panel'.$id.'" role="tab" id="panel'.$id.'-heading" aria-controls="panel'.$id.'">'.$title.'</a>';
    $output .= '<div id="panel'.$id.'" class="content" role="tabpanel" aria-labelledby="panel'.$id.'-heading">';
    $output .= $content;
    $output .= '</div>';
    $output .= '</dd>';

    return apply_filters('accordion_panel', $output);
}
add_shortcode('accordion_panel', 'monolith_accordion_panel_shortcode');

/**
 * Foundation row [row]
 * @param array $atts
 * @param string $content
 * @return string
 */
function foundation_row_shortcode($atts, $content = null) {
	return '<div class="row">'.apply_filters('the_content', $content).'</div>'; }
add_shortcode('row', 'foundation_row_shortcode');

/**
 * Foundation columns [foundation_columns]
 * @param array $atts
 * @param string $content
 * @return string
 */
function foundation_columns_shortcode( $atts, $content = null ) {
extract( shortcode_atts( array(
'columns' => '', /* large-12 small-5 etc */
), $atts ) );

$output = '<div class="columns '. $columns . '">';
$output .= apply_filters('the_content', $content);
$output .= '</div>';

return $output;
}
add_shortcode('foundation_columns', 'foundation_columns_shortcode');

/**
 * Address [address]
 * @param array $atts
 * @param string $content
 * @return string
 */

function address_shortcode( $atts, $content = null ) {
	extract( shortcode_atts( array(
	'type' => 'no-bullet', /* no-bullet inline-list */
	), $atts ) );

    ob_start();
    include(get_template_directory() . '/builder-parts/address.php');
    return ob_get_clean();
}
add_shortcode('monolith_address', 'address_shortcode');


/**
 * Stretch Band shortcode [stretch_band]
 */
function stretch_band_shortcode($atts, $content = null) {
	extract( shortcode_atts( array(
			'type' => ''
	), $atts ) );

	return '<div class="m3-shortcode stretch-band '. $type .'"><div class="row"><div class="columns">'.apply_filters('the_content', $content).'</div></div></div>';
}
add_shortcode('stretch_band', 'stretch_band_shortcode');

