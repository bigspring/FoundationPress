<?php
/*
Template Name: Front
*/
get_header(); ?>

<?php get_template_part('template-parts/header-hero'); ?>

<?php do_action( 'foundationpress_before_content' ); ?>
<?php while ( have_posts() ) : the_post(); ?>
<section class="intro" role="main">
	<div class="fp-intro">

		<div <?php post_class() ?> id="post-<?php the_ID(); ?>">
			<?php do_action( 'foundationpress_page_before_entry_content' ); ?>
			<div class="entry-content">
				<?php the_content(); ?>
			</div>
			<footer>
				<?php wp_link_pages( array('before' => '<nav id="page-nav"><p>' . __( 'Pages:', 'foundationpress' ), 'after' => '</p></nav>' ) ); ?>
			</footer>
		</div>

	</div>
</section>
<?php endwhile;?>
<?php do_action( 'foundationpress_after_content' ); ?>
<?php get_footer();
