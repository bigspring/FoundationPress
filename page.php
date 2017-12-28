<?php
/**
 * The template for displaying pages
 *
 * This is the template that displays all pages by default.
 * Please note that this is the WordPress construct of pages and that
 * other "pages" on your WordPress site will use a different template.
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<?php /*
<?php get_template_part( 'template-parts/breadcrumbs' ); ?>
<?php get_template_part( 'template-parts/header-standard' ); ?>
	
	<div class="main-wrap" role="main">
		
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

<?php get_footer();
*/ ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>
<div class="main-container">
	<div class="main-grid">
		<main class="main-content">
			<?php
			while ( have_posts() ) :
				the_post();
?>
				<?php get_template_part( 'template-parts/content', 'page' ); ?>
				<?php comments_template(); ?>
			<?php endwhile; ?>
		</main>
		<?php get_sidebar(); ?>
	</div>
</div>
<?php
get_footer();
