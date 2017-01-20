<div class="tabs-panel <?= $count === 0 ? 'is-active' : '' ?>" id="panel-<?= get_the_id() ?>">
	<?php the_content(); ?>
</div>