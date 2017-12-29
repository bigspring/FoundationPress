<?php
/*
Template Name: Sitemap
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
*/
get_header(); ?>

<?php get_template_part( 'template-parts/header-standard' ); ?>
<?php get_template_part( 'template-parts/breadcrumbs' ); ?>

<div class="main-container">
	<div class="main-grid">
		<main class="main-content-full-width">
			<?php while ( have_posts() ) : the_post(); ?>
				<?php get_template_part( 'template-parts/content', 'page' ); ?>
				<ul class="no-bullet"><?php wp_list_pages("title_li=" ); ?></ul>
			<?php endwhile; ?>
		</main>
	</div>
</div>
<?php get_footer();
