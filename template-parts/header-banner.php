<?php
	// If a feature image is set, get the id, so it can be injected as a css background property
	if ( has_post_thumbnail( $post->ID ) ) :
		$image = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' );
		$image = $image[0];
		?>

	<header id="header-banner" role="banner" style="background-image: url('<?php echo $image ?>')">
		<div class="row">
			<div class="caption">
				<?php get_template_part('/template-parts/page-header-title'); ?>
				<?php get_template_part('/template-parts/page-header-excerpt'); ?>
			</div>
		</div>
	</header>
	<?php endif;
