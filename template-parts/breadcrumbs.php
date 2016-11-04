<?php
/**
 * Breadcrumbs layout, currently only supports NavXT (https://wordpress.org/plugins/breadcrumb-navxt/)
 * @package monolith
 */
?>


<?php if ( function_exists( 'bcn_display' ) && ! is_front_page() ) : // load the bradcrumbs, except on the front page ?>

<div class="row">
  <div class="medium-12 column">
    <ul class="breadcrumbs">
      <?php bcn_display_list(); ?>
    </ul>
  </div>
</div>

<?php endif; ?>
