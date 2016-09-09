<?php
/**
 * Template part for the excerpts
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */
 ?>

<?php if(is_home() && get_option( 'monolith_blog_page_introtext' )) : ?>
  <p class="lead sub-heading">
    <?= get_option( 'monolith_blog_page_introtext' ); // display site option  ?>
  </p>

<?php elseif(has_excerpt()) : ?>
	<p class="lead sub-heading">
		<?= get_the_excerpt(); ?>
	</p>

<?php elseif ( is_tax() || is_category() ) : // or if it's a tax, use the tax name ?>

  <?php global $wp_query;
  $term = $wp_query->get_queried_object();
  ?>

	<p class="lead sub-heading">
		<?= $term->description; ?>
	</p>

<?php elseif(is_search()) : ?>

	<!-- 	We hit nothing  -->

<?php endif; ?>


