<?php
/**
 * The card template, used by the builder function
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */
?>

<a id="<?php echo sanitize_title( get_the_title() ) ?>" href="<?php the_permalink(); ?>">
	<div class="m3-card card-background-image">
		
		<div class="caption">
			
			<?php if ( $args['has_title'] ) : // display only if the summary is enabled (default is true) ?>
				<h3 class="title <?php echo $args['has_summary'] ? 'has-summary' : '' ?>">
					<?php the_title(); ?>
				</h3>
			<?php endif; // end has_title ?>
			
			<?php if ( $args['has_summary'] ) : // display only if the summary is enabled (default is true) ?>
				<div class="summary">
					<p><?php echo wp_trim_words( get_the_excerpt(), 20, '...' ); ?></p>
				</div>
			<?php endif; // end has_summary ?>
			
			<?php if ( $args['has_readmore'] ) : ?>
				<span class="read-more button secondary">Read case study</span>
			<?php endif; ?>
		</div>
		
		<?php if ( $args['has_image'] && has_post_thumbnail() ) : // display the featured image if argument is true ?>
			<div class="featured-image" style="background-image: url('<?php echo wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0] ?>')"></div>
		<?php endif; // end has_image ?>
	
	</div>
</a>
