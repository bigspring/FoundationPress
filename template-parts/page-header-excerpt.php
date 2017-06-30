<?php /**
 * Template part for the excerpts
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */ ?>

<?php if ( is_home() && get_option( 'monolith_blog_page_introtext' ) ) : ?>
	<p class="lead sub-heading">
		<?php echo get_option( 'monolith_blog_page_introtext' ); // display site option   ?>
	</p>
<?php elseif ( is_post_type_archive() ) : ?>
	<?php $archive      = get_queried_object(); ?>
	<p class="lead sub-heading">
		<?php echo monolith_get_cpt_archive_intro(); ?>
	</p>
<?php elseif ( has_excerpt() ) : ?>
	<p class="lead sub-heading">
		<?php echo get_the_excerpt(); ?>
	</p>
<?php elseif ( is_tax() || is_category() ) : // or if it's a tax, use the tax name ?>
	<?php global $wp_query;
	$term = $wp_query->get_queried_object();
	?>
	<p class="lead sub-heading">
		<?php echo $term->description; ?>
	</p>
<?php endif; ?>
