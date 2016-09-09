<?php
/**
 * Tabs layout file for bulder
 *
 * @package FoundationPress
 * @since Monolith 1.0.0
 */

?>

<?php if ( $loop->have_posts() ) : // if we have a loop load the tabs organism ?>

  <?php $count = 0; // initiate the count ?>

    <!-- the tabs navigation   -->
    <ul class="tabs <?= $args['classes'] ?>" data-tabs id="builder-tabs">
    <?php while ( $loop->have_posts() ) : $loop->the_post(); ?>
      <li class="tabs-title <?= $count === 0 ? 'is-active' : '' ?>"><a href="#panel-<?= get_the_id() ?>"><?php the_title(); ?></a></li>
      <?php $count ++ ?>
    <?php endwhile; ?>
    </ul>
    <!-- end tab layout wrapper -->
    <?php $count = 0; // reset the count  ?>

    <!-- the tabs content -->
    <div class="tabs-content" data-tabs-content="builder-tabs">
      <?php while ( $loop->have_posts() ) : $loop->the_post(); ?>
      <div class="tabs-panel <?= $count === 0 ? 'is-active' : '' ?>" id="panel-<?= get_the_id() ?>">
        <?php the_content(); ?>
      </div>
      <?php $count ++ ?>
      <?php endwhile; ?>
    </div>

<?php else : // otherwise load the content-none molecule ?>
  <?php get_template_part('template-parts/content-none'); ?>
<?php endif; ?>
