<?php
/**
 * The card template, used by the builder function
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */
?>

<a id="<?php echo sanitize_title( get_the_title() ) ?>" href="<?php the_permalink(); ?>">

  <div class="m3-card" data-equalizer-watch>

    <?php if ( $args['has_image'] ) : // display the featured image if argument is true ?>
      <div class="featured-image">
        <?php the_monolith_post_thumbnail('square-small') ?>
      </div>
    <?php endif; // end has_image ?>

    <div class="caption">
      <?php if ( $args['has_title'] ) : // display only if the summary is enabled (default is true) ?>
	      <h3 class="title <?php echo $args['has_summary'] ? 'has-summary' : '' ?>"><?php the_title(); ?></h3>
      <?php endif; // end has_title ?>

      <?php if ( $args['has_summary'] ) : // display only if the summary is enabled (default is true) ?>
        <div class="summary">
          <p><?php echo wp_trim_words( get_the_excerpt(), 20, '...' ); ?></p>
        </div>
      <?php endif; // end has_summary ?>
    </div>

  </div>
</a>
