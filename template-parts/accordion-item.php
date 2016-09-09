<?php
/**
 * The accordion template part, used by builder
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>

  <li class="accordion-item" data-accordion-item>
    <a href="#" class="accordion-title"><h5><?php the_title(); ?></h5></a>
    <div class="accordion-content" data-tab-content>
      <?php the_content(); ?>
    </div>
  </li>
