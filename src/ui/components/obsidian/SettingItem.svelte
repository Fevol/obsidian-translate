<script lang="ts">
	export let name: string;
	export let description: string | null = null;
	export let type: "dropdown" | "toggle" | "slider" | "heading" | "subheading" | "subsubheading" | null = null;
	export let depth: number = 0;

	interface InformationField {
		/**
		 * The URL to link to.
		 */
		url?: string;
		type?: "info" | "warning" | "error";

		/**
		 * The text to display.
		 */
		text: string;

		/**
		 * Classes to apply to the text.
		 */
		style?: string;
	}

	export let notices: InformationField[] = [];
</script>

<div
	class={($$props.class ?? "") + " setting-item" +
		(depth ? ` svelcomlib-${'sub'.repeat(depth)}setting` : "") +
		(type === "heading" ? ` svelcomlib-setting-${'sub'.repeat(depth)}heading` : "")
	}
	class:mod-dropdown={type === "dropdown"}
	class:mod-toggle={type === "toggle"}
	class:mod-slider={type === "slider"}
	class:setting-item-heading={type === "heading"}
>
	<div class="setting-item-info">
		<div class="setting-item-name">
			<div>
				{@html name}
			</div>
		</div>
			<div class="setting-item-description">
				{@html description}
				{#each notices as notice, idx}
					{#if notice}
						{#if description || idx !== 0}
							<br>
						{/if}
						<span
							class={"svelcomlib-notice " + (notice.style ?? "")}
							class:svelcomlib-notice-info={notice.type === "info"}
							class:svelcomlib-notice-warning={notice.type === "warning"}
							class:svelcomlib-notice-error={notice.type === "error"}
						>
							{@html notice.text}
						</span>
					{/if}
				{/each}
			</div>

	</div>
	<div class="setting-item-control">
		<slot name="control"/>
	</div>
</div>
<slot name="subcontrol"/>
