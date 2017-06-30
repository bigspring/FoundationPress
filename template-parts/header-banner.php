<?php
/**
 * Template part for page header banner
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

$image_src = null;

// Determine what image to use as the banner background.
if ( is_archive() && !is_home() ) {
	// Get non-thumbnail image using a suitable method for project requirements.
	if ( is_post_type_archive() ) {
		$cpt       = get_queried_object();
		$image_src = m3_get_cpt_archive_image_src( $cpt->name, 'full' );
	}
} else {
	if ( has_post_thumbnail( $post->ID ) ) {
		$image     = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' );
		$image_src = $image[0];
	}
}

$background_image_css = $image_src ? "background-image : url( '{$image_src}' )" : '';
?>
<header class="header-banner" role="banner" style="<?php echo $background_image_css ?>">
	<div class="row">
		<div class="caption">
			<?php get_template_part( '/template-parts/page-header-title' ); ?>
			<?php get_template_part( '/template-parts/page-header-excerpt' ); ?>
		</div>
	</div>
</header>
