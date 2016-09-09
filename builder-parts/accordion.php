<?php
/**
 *  The accoridon builder, calls in accordion template part
 *
 * @package monolith
 */
 ?>

<?php if ( $loop->have_posts() ) : // if we have a loop load the accordion organism ?>

  <ul class="accordion" data-accordion data-allow-all-closed="true">

    <?php while ( $loop->have_posts() ) : $loop->the_post(); ?>

      <?php get_template_part('template-parts/accordion-item'); ?>

    <?php endwhile; ?>

    </ul>

<?php else : // otherwise load the content-none molecule ?>

      <?php get_template_part('template-parts/content-none'); ?>

<?php endif;
