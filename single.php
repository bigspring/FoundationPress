<?php
/**
 * The template for displaying all single posts and attachments
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<?php /*
	<?php get_template_part( 'template-parts/breadcrumbs' ); ?>
	
	<div class="main-wrap" role="main">
		
		<?php do_action( 'foundationpress_before_content' ); ?>
		<?php while ( have_posts() ) : the_post(); ?>
			<article <?php post_class( 'main-content' ) ?> id="post-<?php the_ID(); ?>">
				<header>
					<h1 class="entry-title"><?php the_title(); ?></h1>
					<?php foundationpress_entry_meta(); ?>
				</header>
				<?php do_action( 'foundationpress_post_before_entry_content' ); ?>
				<div class="entry-content">
					
					<?php get_template_part( 'template-parts/blog-social-meta' ); ?>
					
					<?php //get_template_part( 'template-parts/featured-image' ); ?>
					<?php
					if ( has_post_thumbnail() ) :
						the_post_thumbnail();
					endif;
					?>
					<?php the_content(); ?>
					<?php edit_post_link( __( 'Edit', 'foundationpress' ), '<span class="edit-link">', '</span>' ); ?>
				</div>
				<footer>
					<?php
					wp_link_pages(
						array(
							'before' => '<nav id="page-nav"><p>' . __( 'Pages:', 'foundationpress' ),
							'after'  => '</p></nav>',
						)
					);
					?>
				</footer>
			</article>
		<?php endwhile; ?>
		
		<?php do_action( 'foundationpress_after_content' ); ?>
		<?php get_sidebar(); ?>
	</div>
*/ ?>

<?php get_template_part( 'template-parts/featured-image' ); ?>
<div class="main-container">
	<div class="main-grid">
		<main class="main-content">
			<?php while ( have_posts() ) : the_post(); ?>
				<?php get_template_part( 'template-parts/content', '' ); ?>
				<?php the_post_navigation(); ?>
				<?php comments_template(); ?>
			<?php endwhile; ?>
		</main>
		<?php get_sidebar(); ?>
	</div>
</div>
<?php get_footer();
