<?php
/*
Template Name: Full Width
*/
get_header(); ?>

<?php /*
<?php get_template_part( 'template-parts/breadcrumbs' ); ?>
<?php get_template_part( 'template-parts/header-standard' ); ?>
	
	<div class="main-wrap full-width" role="main">
		
		<?php do_action( 'foundationpress_before_content' ); ?>
		
		<?php while ( have_posts() ) : the_post(); ?>
			<article <?php post_class( 'main-content' ) ?> id="post-<?php the_ID(); ?>">
				<?php do_action( 'foundationpress_page_before_entry_content' ); ?>
				<div class="entry-content">
					<?php the_content() ?>
				</div>
			</article>
		<?php endwhile; ?>
		
		<?php do_action( 'foundationpress_after_content' ); ?>
	
	</div>

*/ ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>
<div class="main-container">
	<div class="main-grid">
		<main class="main-content-full-width">
			<?php while ( have_posts() ) : the_post(); ?>
				<?php get_template_part( 'template-parts/content', 'page' ); ?>
				<?php comments_template(); ?>
			<?php endwhile; ?>
		</main>
	</div>
</div>
<?php get_footer();
