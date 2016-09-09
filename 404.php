<?php
/**
 * The template for displaying 404 pages (not found)
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<div class="row">
	<div class="small-12 large-6 column medium-centered" role="main">

		<article <?php post_class() ?> id="post-<?php the_ID(); ?>">
			<header>
				<h1 class="entry-title"><?php _e( 'Error 404: Page not found', 'foundationpress' ); ?></h1>
			</header>
			<div class="entry-content">
				<div class="error">
					<p class="lead"><?php _e( 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.', 'foundationpress' ); ?></p>
				</div>
				<hr/>
				<h4><?php _e( 'Try the following:', 'foundationpress' ); ?></h4>
				<ul>
					<li><?php _e( 'Check your spelling', 'foundationpress' ); ?></li>
					<li><?php printf( __( 'Return to the <a href="%s">home page</a>', 'foundationpress' ), home_url() ); ?></li>
					<li><?php _e( 'Click the <a href="javascript:history.back()">Back</a> button', 'foundationpress' ); ?></li>
				</ul>
				<hr/>
				<h4><?php _e( 'Or try searching the site:', 'foundationpress' ); ?></h4>
				<?php get_search_form(); ?>
			</div>
		</article>

	</div>
</div>
<?php get_footer();
