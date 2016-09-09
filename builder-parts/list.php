<?php
/**
 * The list organism that calls in the list-item molecule
 *
 * @package monolith
 */
?>
<?php if ( $loop->have_posts() ) : // if we have results run the loop  ?>
  <!-- start ul wrapper -->
  <ul class="<?= $args['classes'] ?>">
    <?php while ( $loop->have_posts() ) : $loop->the_post(); ?>
      <li>
        <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
      </li>
    <?php endwhile; ?>
  </ul>
  <!-- end ul wrapper -->

<?php else : // otherwise show the content none organism ?>
  <?php get_template_part('template-parts/content-none'); ?>
<?php endif;
