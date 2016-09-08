<?php
/**
 * The main template file
 *
 * This is the most generic template file in a WordPress theme
 * and one of the two required files for a theme (the other being style.css).
 * It is used to display a page when nothing more specific matches a query.
 * e.g., it puts together the home page when no home.php file exists.
 *
 * Learn more: {@link https://codex.wordpress.org/Template_Hierarchy}
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

get_header(); ?>

<div id="page" role="main">
	<article class="main-content">

		<?php monolith_build( array('layout' => 'snippets', 'part' => 'snippet') ); ?>


		<?php //monolith_grid( 'card', 'row columns' ); ?>
		<?php //monolith_accordion(); ?>
		<?php //monolith_list(); ?>
		<?php //monolith_tabs(); ?>


		<?php //build('snippets', array('classes' => 'row')); ?>

	</article>
	<?php get_sidebar(); ?>

</div>

<?php get_footer();
