<?php
/**
 * Search Result Snippet
 * @package monolith
 */
?>
<?php
$post_type = get_post_type();
$obj       = get_post_type_object( $post_type );
?>

<!-- start single snippet -->
<article class="search-result callout">

  <!-- entry title -->
  <header>
    <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a> <span class="label float-right"><?php echo $obj->labels->singular_name ?></span></h3>
    <a href="<?php echo get_permalink(); ?>" rel="bookmark"><?php echo get_permalink(); ?></a>
  </header>

  <div class="search-content">
    <?php if ( has_excerpt() ) : ?>
      <?php echo wp_trim_words( get_the_excerpt(), 35, '...' ); ?>
    <?php else : ?>
      <?php echo wp_trim_words( get_the_content(), 35, '...' ); ?>
    <?php endif; ?>
  </div>

</article>
<!-- end single snippet -->
