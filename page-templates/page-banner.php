<?php
/*
Template Name: Banner
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
*/
get_header(); ?>

<?php get_template_part( 'template-parts/header-banner' ); ?>
	
	<div class="main-wrap full-width" role="main">
		
		<?php do_action( 'foundationpress_before_content' ); ?>
		
		<?php while ( have_posts() ) : the_post(); ?>
			<article <?php post_class( 'main-content' ) ?> id="post-<?php the_ID(); ?>">
				<?php do_action( 'foundationpress_page_before_entry_content' ); ?>
				<div class="entry-content">
					<?php the_content(); ?>
				</div>
			</article>
		<?php endwhile; ?>
		
		<?php do_action( 'foundationpress_after_content' ); ?>
	
	</div>

<?php get_footer();
