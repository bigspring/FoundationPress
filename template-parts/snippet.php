<?php
/**
 * Snippet part
 *
 * Used for index/archive parts
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */
?>

<div id="post-<?php the_ID(); ?>" <?php post_class('snippet'); ?>>
		<header>
				<h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
		<?php // foundationpress_entry_meta(); ?>
	</header>
	<div class="entry-content">
		<p><?php echo wp_trim_words( get_the_excerpt(), 30, '...' ); ?></p>
	</div>
	<footer>
		<a href="<?php the_permalink(); ?>" class="read-more button"><?php _e( 'Read more', 'foundationpress' ); ?></a>
	</footer>
	<hr />
</div>

