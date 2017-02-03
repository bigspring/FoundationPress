<?php
/**
 * The card template, used by the builder function
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>

<a id="<?= sanitize_title( get_the_title() ) ?>" href="<?php the_permalink(); ?>" itemprop="url">
  <div class="m3-card" data-equalizer-watch>

    <?php if ( $args['has_image'] ) : // display the featured image if argument is true ?>
      <div class="featured-image" itemprop="image">
        <?php the_post_thumbnail( 'fp-medium' ); ?>
      </div>
    <?php endif; // end has_image ?>

    <div class="caption">
      <?php if ( $args['has_title'] ) : // display only if the summary is enabled (default is true) ?>
	      <h3 class="title <?= $args['has_summary'] ? 'has-summary' : '' ?>"><?php the_title(); ?></h3>
      <?php endif; // end has_title ?>

      <?php if ( $args['has_summary'] ) : // display only if the summary is enabled (default is true) ?>
        <div class="summary">
          <?= wp_trim_words( get_the_excerpt(), 20, '...' ); ?>
        </div>
      <?php endif; // end has_summary ?>
    </div>

  </div>
</a>
