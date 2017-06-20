<?php
/**
 * Template part for page header banner
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

$image = null;

// Determine what image to use as the banner background.
if ( is_archive() ) {
	// Get image using a suitable method for project requirements.
} else {
	if ( has_post_thumbnail( $post->ID ) ) {
		$image     = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' );
		$image_src = $image[0];
	}
}
?>
<?php if ( $image ) : ?>
	<header class="header-banner" role="banner" style="background-image: url('<?php echo $image_src ?>')">
		<div class="row">
			<div class="caption">
				<?php get_template_part( '/template-parts/page-header-title' ); ?>
				<?php get_template_part( '/template-parts/page-header-excerpt' ); ?>
			</div>
		</div>
	</header>
<?php endif;
