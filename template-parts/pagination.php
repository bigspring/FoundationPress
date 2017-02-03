<?php /* Display navigation to next/previous pages when applicable */ ?>
<?php
if ( function_exists( 'foundationpress_pagination' ) ) :
	foundationpress_pagination();
elseif ( is_paged() ) :
	?>
	<nav id="post-nav">
		<div class="post-previous"><?php next_posts_link( __( '&larr; Older posts', 'foundationpress' ) ); ?></div>
		<div class="post-next"><?php previous_posts_link( __( 'Newer posts &rarr;', 'foundationpress' ) ); ?></div>
	</nav>
<?php endif; ?>
