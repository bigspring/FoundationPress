<?php
/**
 * Social media icons, based on theme options
 * @package monolith
 */
?>

<!-- start social media icon list -->
<ul class="menu social-icons">

  <?php if ( get_option( 'monolith_facebook' ) ) { ?>
    <li>
      <a class="social-icon facebook" href="<?php echo get_option( 'monolith_facebook' ); ?>">
        <span class="fa-stack fa-lg">
          <i class="fa fa-circle fa-stack-2x"></i>
          <i class="fa fa-facebook fa-stack-1x fa-inverse"></i>
        </span>
      </a>
    </li>
  <?php } ?>

  <?php if ( get_option( 'monolith_twitter' ) ) { ?>
    <li>
      <a class="social-icon twitter" href="<?php echo get_option( 'monolith_twitter' ); ?>">
        <span class="fa-stack fa-lg">
          <i class="fa fa-circle fa-stack-2x"></i>
          <i class="fa fa-twitter fa-stack-1x fa-inverse"></i>
        </span>
      </a>
    </li>
  <?php } ?>

  <?php if ( get_option( 'monolith_googleplus' ) ) { ?>
    <li>
      <a class="social-icon google" href="<?php echo get_option( 'monolith_googleplus' ); ?>">
        <span class="fa-stack fa-lg">
          <i class="fa fa-circle fa-stack-2x"></i>
          <i class="fa fa-google fa-stack-1x fa-inverse"></i>
        </span>
      </a>
    </li>
  <?php } ?>

  <?php if ( get_option( 'monolith_instagram' ) ) { ?>
    <li>
      <a class="social-icon instagram" href="<?php echo get_option( 'monolith_instagram' ); ?>">
        <span class="fa-stack fa-lg">
          <i class="fa fa-circle fa-stack-2x"></i>
          <i class="fa fa-instagram fa-stack-1x fa-inverse"></i>
        </span>
      </a>
    </li>
  <?php } ?>

  <?php if ( get_option( 'monolith_linkedin' ) ) { ?>
    <li>
      <a class="social-icon linkedin" href="<?php echo get_option( 'monolith_linkedin' ); ?>">
        <span class="fa-stack fa-lg">
          <i class="fa fa-circle fa-stack-2x"></i>
          <i class="fa fa-linkedin fa-stack-1x fa-inverse"></i>
        </span>
      </a>
    </li>
  <?php } ?>

  <?php if ( get_option( 'monolith_youtube' ) ) { ?>
    <li>
      <a class="social-icon youtube" href="<?php echo get_option( 'monolith_youtube' ); ?>">
        <span class="fa-stack fa-lg">
          <i class="fa fa-circle fa-stack-2x"></i>
          <i class="fa fa-youtube fa-stack-1x fa-inverse"></i>
        </span>
      </a>
    </li>
  <?php } ?>

</ul>
<!-- end social media icon list -->

