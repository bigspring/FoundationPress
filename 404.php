<?php
/**
 * The template for displaying 404 pages (not found)
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>
	
	<div id="page-full-width" role="main">
	  
	  <?php do_action( 'foundationpress_before_content' ); ?>
		
		<header class="header-standard">
			<div class="caption">
				<h1 class="entry-title"><?php _e( 'Error 404: Page not found', 'foundationpress' ); ?></h1>
			</div>
		</header>
		
		<section <?php post_class( 'main-content' ) ?> id="post-<?php the_ID(); ?>">
		<?php do_action( 'foundationpress_page_before_entry_content' ); ?>
			<div class="entry-content">
				<div class="error">
					<p
						class="lead"><?php _e( 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.', 'foundationpress' ); ?></p>
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
		</section>
	  <?php do_action( 'foundationpress_after_content' ); ?>
	
	</div>
<?php get_footer();
