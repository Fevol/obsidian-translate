<script lang="ts">
	import TranslatorPlugin from "../../../main";

	import {onDestroy, onMount} from "svelte";
	import {data, glossary, settings} from "../../../stores";

	import {Button, Dropdown, Toggle, Input, Icon, ToggleButton} from "../../components";
	import {SettingItem} from "../../obsidian-components";

	import {ConfirmationModal} from "../../modals";

	import {DefaultDict} from "../../../util";
	import {fuzzySearch, prepareQuery, Scope} from "obsidian";


	export let plugin: TranslatorPlugin;

	const all_languages = Array.from($data.all_languages.entries()).map(([key, value]) => {
		return {
			value: key,
			text: value
		}
	}).sort((a, b) => a.text.localeCompare(b.text));


	let glossaries: DefaultDict = new DefaultDict(glossary.dicts, []);

	let source_language = plugin.current_language;
	let target_language = $settings.default_target_language;
	
	let glossary_pair;
	let language_pair = "";
	let reverse_language_pair = "";

	let table;
	let old_row = [];
	let new_row: string[] = ["", ""];

	let add_both_directions = false;
	let filter_text = "";
	let sort_direction = -1;

	const available_services = [{"value": "deepl", "text": "DeepL"}];
	let sync_service = available_services[0].value;
	
	$: {
		language_pair = source_language + target_language;
		reverse_language_pair = target_language + source_language;
		updateGlossary();
	}

	$: sort_direction, sortTable();

	$: filter_text, filterTable();

	function updateGlossary() {
		glossary_pair = glossaries[language_pair];
		filterTable();
		sortTable();
	}

	function sortTable() {
		if (sort_direction >= 0) {
			const column = sort_direction > 1 | 0;
			const descending = sort_direction % 2;
			if (!descending)
				glossary_pair = glossary_pair.sort((a, b) => a[column].localeCompare(b[column]));
			else
				glossary_pair = glossary_pair.sort((a, b) => b[column].localeCompare(a[column]));

		}
	}

	function filterTable() {
		glossary_pair = glossaries[language_pair];
		const q = prepareQuery(filter_text);
		const left_matches = glossary_pair.map((item) => fuzzySearch(q, item[0]));
		const right_matches = glossary_pair.map((item) => fuzzySearch(q, item[1]));

		const indexes: Set<number> = new Set(left_matches.map((x, i) => x ? i : -1).filter((x) => x >= 0)
				.concat(...right_matches.map((x, i) => x ? i : -1).filter((x) => x >= 0)).sort((a, b) => a - b));

		if (glossary_pair.length !== indexes.size)
			glossary_pair = glossary_pair.filter((_, i) => indexes.has(i));
	}

	const view_scope = new Scope(app.scope);
	// TODO: Check if delete history would be possible to implement easily (with undo/redo)
	view_scope.register(['Mod'], 'S', () => {
		[target_language, source_language] = [source_language, target_language];
		return false;
	})
	app.keymap.pushScope(view_scope);

	onMount(async () => {
		if (!$settings.local_glossary && !Object.keys(glossary.dicts).length) {
			let loaded_glossaries = await app.vault.adapter.read(".obsidian/plugins/obsidian-translate/glossary.json");
			if (loaded_glossaries) {
				glossaries = new DefaultDict(JSON.parse(loaded_glossaries), []);
				glossary_pair = glossaries[language_pair]
			}
		}
	});

	onDestroy(() => {
		let local_glossaries: Object = Object.assign({}, glossaries);

		app.vault.adapter.write(".obsidian/plugins/obsidian-translate/glossary.json", JSON.stringify(local_glossaries, null, "\t"));
		glossary.dicts = local_glossaries;
		for (let key in glossary.dicts) {
			glossary.replacements[key] = new RegExp(glossary.dicts[key].map((item) => item[0]).join("|"),
				$settings.case_insensitive_glossary ? "gi" : "g");
		}

		app.keymap.popScope(view_scope);
	});

	const disableLinebreaks = (e) => {
		if (e.keyCode === 13) {
			const uncle = e.shiftKey ? e.target.parentNode.previousSibling : e.target.parentNode.nextSibling;
			if (uncle && uncle.nodeType === 1)
				uncle.children[e.target.cellIndex].focus();
			else if (!e.shiftKey)
				e.target.parentNode.parentNode.lastChild.children[e.target.cellIndex].focus();
			document.activeElement.scrollIntoView({behavior: "smooth", block: "center"});
			e.preventDefault();
		}
	}

	function addRow() {
		new_row[0] = new_row[0].replace(/^(?:&nbsp;|\s)+|(?:&nbsp;|\s)+$/ig,'');
		new_row[1] = new_row[1].replace(/^(?:&nbsp;|\s)+|(?:&nbsp;|\s)+$/ig,'');

		if (!new_row[0] || !new_row[1]) return;

		let duplicate_row = glossaries[language_pair].find((row) => row[0] === new_row[0]);
		let reverse_duplicate_row: string[];
		if (add_both_directions)
			reverse_duplicate_row = glossaries[reverse_language_pair].find((row) => row[0] === new_row[1]);

		if (duplicate_row || reverse_duplicate_row) {
			const src_language = $data.all_languages.get(source_language)
			const tgt_language = $data.all_languages.get(target_language)

			if (duplicate_row && duplicate_row[1] === new_row[1]) {
				plugin.message_queue(`Entry (${new_row[0]}, ${new_row[1]}) already exists in ${src_language} → ${tgt_language} glossary`, 5000);
				return;
			}

			new ConfirmationModal(
				plugin,
				"Duplicate entries detected",
				`Found a term that already exists in the glossary. Do you wish to <b>overwrite</b> it?<br>
				${!duplicate_row ? '' : `<div class="translator-confirm-glossary"><div>${src_language} ⭢ ${tgt_language}</div>
					<div>(${duplicate_row[0]}, <span class="translator-confirm-glossary-change">${duplicate_row[1]}</span>) ⭢
					(${new_row[0]}, <span class="translator-confirm-glossary-change">${new_row[1]}</span>)</div></div>`}<br>
				${!reverse_duplicate_row ? '' : `<div class="translator-confirm-glossary"><div>${tgt_language} ⭢ ${src_language}</div>
					<div>(${reverse_duplicate_row[0]}, <span class="translator-confirm-glossary-change">${reverse_duplicate_row[1]}</span>) ⭢
					(${new_row[1]}, <span class="translator-confirm-glossary-change">${new_row[0]}</span>)</div></div>`}`,
				async () => {
					if (duplicate_row)
						glossaries[language_pair].splice(glossaries[language_pair].indexOf(duplicate_row), 1);
					if (add_both_directions && reverse_duplicate_row)
						glossaries[reverse_language_pair] = glossaries[reverse_language_pair].filter((row) => row[0] !== reverse_duplicate_row[0]);

					glossaries[language_pair] = [...glossaries[language_pair], [...new_row]];
					if (add_both_directions)
						glossaries[reverse_language_pair] = [...glossaries[reverse_language_pair], [new_row[1], new_row[0]]];
					new_row = ["", ""];

					plugin.message_queue("Overwritten entry");
					updateGlossary();
				},
			).open();
		} else {
			glossaries[language_pair] = [...glossaries[language_pair], [...new_row]];
			if (add_both_directions)
				glossaries[reverse_language_pair] = [...glossaries[reverse_language_pair], [new_row[1], new_row[0]]];
			new_row = ["", ""];
			updateGlossary();
		}

		// Ensure that the new row is constructed and visible, before focusing on the first element of that row
		setTimeout(() => {
			table.children[1].lastChild.children[0].focus();
			table.scrollTop = table.scrollHeight;
		}, 0);
	}

	function deleteRow(row) {
		glossaries[language_pair] = glossaries[language_pair].filter(r => r != row);
		updateGlossary();
		if (add_both_directions)
			glossaries[reverse_language_pair] = glossaries[reverse_language_pair].filter(r => r[0] != row[1] && r[1] != row[0]);
	}

	function updateRow(row) {
		// FIXME: A lot of wonkyness here, future me: please fix
		// Strip cells of whitespace characters
		row[0] = row[0].replace(/^(?:&nbsp;|\s)+|(?:&nbsp;|\s)+$/ig,'');
		row[1] = row[1].replace(/^(?:&nbsp;|\s)+|(?:&nbsp;|\s)+$/ig,'');

		// Check for empty cells in new input, resets row to previous value
		if (!(row[0] && row[1])) {
			let idx = glossaries[language_pair].indexOf(row);
			glossaries[language_pair][idx] = old_row;
			plugin.message_queue("Empty cells are not allowed");
			return;
		}

		// Check if row is unchanged from previous value (reset in case of whitespaces)
		if (row[0] === old_row[0] && row[1] === old_row[1]) {
			glossaries[language_pair][glossaries[language_pair].indexOf(row)] = old_row;
			return;
		}

		let duplicate_row: string[];
		let reverse_duplicate_row: string[];

		// Search for rows with duplicate cell values
		if (old_row[0] !== row[0]) {
			let duplicate_rows = glossaries[language_pair].filter(r => r[0] === row[0]);
			if (duplicate_rows.length > 1) {
				duplicate_row = duplicate_rows.find(r => r[1] !== old_row[1]);
				if (!duplicate_row) {
					glossaries[language_pair] = glossaries[language_pair].map(r => r === row ? old_row : r);
					plugin.message_queue(`Entry (${row[0]}, ${row[1]}) already exists in ${$data.all_languages.get(source_language)} → ${$data.all_languages.get(target_language)} glossary`, 5000);
					return;
				}
			}
		} else if (add_both_directions) {
			// If reverse links should be checked too, check if value of updated row is duplicate in reverse glossary
			let reverse_duplicate_rows = glossaries[reverse_language_pair].filter(r => r[0] === row[1]);
			if (reverse_duplicate_rows)
				reverse_duplicate_row = reverse_duplicate_rows[0];
		}

		if (duplicate_row || reverse_duplicate_row) {
			let src_language = $data.all_languages.get(source_language),
				tgt_language = $data.all_languages.get(target_language);
			new ConfirmationModal(
				plugin,
				"Duplicate entries detected",
				`Found a term that already exists in the glossary. Do you wish to <b>overwrite</b> it?<br>
				${!duplicate_row ? '' : `<div class="translator-confirm-glossary"><div>${src_language} ⭢ ${tgt_language}</div>
					<div>(${duplicate_row[0]}, <span class="translator-confirm-glossary-change">${duplicate_row[1]}</span>) ⭢
					(${row[0]}, <span class="translator-confirm-glossary-change">${row[1]}</span>)</div></div>`}
				${!reverse_duplicate_row ? '' : `<div class="translator-confirm-glossary"><div>${tgt_language} ⭢ ${src_language}</div>
					<div>(${reverse_duplicate_row[0]}, <span class="translator-confirm-glossary-change">${reverse_duplicate_row[1]}</span>) ⭢
					(${row[1]}, <span class="translator-confirm-glossary-change">${row[0]}</span>)</div></div>`}`,
				async () => {
					if (duplicate_row) {
						glossaries[language_pair] = glossaries[language_pair].filter(r => r !== duplicate_row);
						if (add_both_directions) {
							glossaries[reverse_language_pair] = glossaries[reverse_language_pair]
								.map(r => r[0] === old_row[1] && r[1] === old_row[0] ? [row[1], row[0]] : r);
						}
					}
					if (reverse_duplicate_row) {
						glossaries[reverse_language_pair] = glossaries[reverse_language_pair].filter(r => r !== reverse_duplicate_row);
						glossaries[reverse_language_pair] = glossaries[reverse_language_pair]
							.map(r => (r[0] === old_row[1] && r[1] === old_row[0]) ? [row[1], row[0]] : r);
					}
					glossaries[language_pair] = glossaries[language_pair].map(r => r === old_row ? row : r);

					plugin.message_queue(duplicate_row && reverse_duplicate_row ? "Overwritten entries" : "Overwritten entry");
					updateGlossary();
				},
			).open();
			glossaries[language_pair] = glossaries[language_pair].map(r => r === row ? old_row : r);
		} else if (add_both_directions) {
			glossaries[reverse_language_pair] = glossaries[reverse_language_pair]
				.map(r => r[0] === old_row[1] && r[1] === old_row[0] ? [row[1], row[0]] : r);
		}
	}
</script>


<div class="flex-column-element markdown-rendered">
	<SettingItem
		name="Add & Update terms in both directions"
		description="When a glossary entry is added or updated,<br>an entry will be added or updated for the reverse language pair as well"
	>
		<Toggle slot="control" value={add_both_directions} onChange={() => add_both_directions = !add_both_directions}/>
	</SettingItem>

	<div class="flex-row-element translator-glossary-settings">
		<Dropdown
			options={all_languages}
			value={ source_language }
			onChange={(e) => {
				source_language = e.target.value;
			}}
		/>
		<Button
			icon="switch" size="20"
			onClick={() => {
				[target_language, source_language] = [source_language, target_language];
			}}
		/>
		<Dropdown
			options={all_languages}
			value={ target_language }
			onChange={(e) => {
				target_language = e.target.value;
			}}
		/>
	</div>
	<div class="translator-filter-input">
		<Input
			type="text"
			val={filter_text}
			placeholder="Filter..."
			onChange={(e) => {
				filter_text = e.target.value;
			}}
		/>
		<div class="translator-filter-input-icon" on:click={() => filter_text = ""}>
			<Icon icon="cross"/>
		</div>
	</div>


	<table bind:this={table} class="translator-table">
		<thead>
			<tr>
				<th class="translator-table-wide-col" on:click={() => {sort_direction = (sort_direction === -1 || sort_direction > 1) ? 0 : 1 - sort_direction}}>
					<span class="translator-table-cell-header">
						Source
						{#if sort_direction !== -1 && sort_direction < 2}
							<span class="translator-table-cell-header-icon">
								<Icon icon={`chevron-${sort_direction === 0 ? 'down' : 'up'}`}/>
							</span>
						{/if}
					</span>
				</th>
				<th class="translator-table-wide-col" on:click={() => {sort_direction = sort_direction < 2 ? 2 : 5 - sort_direction}}>
					<span class="translator-table-cell-header">
						Target
						{#if sort_direction !== -1 && sort_direction > 1}
							<span class="translator-table-cell-header-icon">
								<Icon icon={`chevron-${sort_direction === 2 ? 'down' : 'up'}`}/>
							</span>
						{/if}
					</span>
				</th>
				<th class="translator-table-empty-col"></th>
			</tr>
		</thead>
		<tbody>
			{#each glossary_pair as row}
				<tr>
					{#each row as cell, i}
						<td contenteditable="true" bind:innerHTML={cell} on:focusin={() => {old_row = JSON.parse(JSON.stringify(row))}}
							on:focusout={() => {
								updateRow(row)
							}} on:keydown={disableLinebreaks}></td>
					{/each}
					<td><Button onClick={() => deleteRow(row)} icon="x"/></td>
				</tr>
			{/each}
			<tr class="translator-table-cell-temporary">
				{#each new_row as column}
					<td contenteditable="true" bind:innerHTML={column} on:keydown={(e) => {
						if (e.keyCode === 13) {
							if (e.shiftKey) {
								const grandfather = e.target.parentNode.parentNode;
								grandfather.children[grandfather.children.length - 2].children[0].focus();
								document.activeElement.scrollIntoView({behavior: "smooth", block: "start"});
							} else {
								addRow();
							}
							e.preventDefault();
						}
					}}></td>
				{/each}
				<td><Button onClick={addRow} icon="plus"/></td>
			</tr>
		</tbody>
	</table>


	<SettingItem
		name="Sync glossary configuration"
		description="When you're finished with editing your glossary, sync it to selected translation service"
		notices={[
			{type: "text", text: "If the service does not support it, glossary <i>can</i> be applied locally if <b>`Local Glossary`</b> setting is enabled", style: 'info-text'},
		]}
	>
		<div slot="control" class="flex-column-element">
			<Dropdown
				class="translator-select"
				slot="control"
				options={available_services}
				value={ sync_service }
				onChange={(e) => {
					sync_service = e.target.value;
				}}
			/>
			<ToggleButton
				text="Sync glossary"
				value={true}
				fn={async () => {
					if (!sync_service) {
						plugin.message_queue("No translation service was selected");
						return;
					}
					//let validation_results = await translator.syncGlossary(glossaries);
					return false;
				}}
			/>
		</div>
	</SettingItem>


</div>

<style>

	.translator-glossary-settings {
		justify-content: center;
		margin: 10px 0;
		gap: var(--size-4-2);
	}

	.translator-table {
		width: 100%;
		border-spacing: 0;
		border-collapse:separate;
		border-radius:8px;

		display: block;
		max-height: 500px;
		overflow-y: scroll;
		box-sizing: border-box;

		background-color: var(--background-secondary);
		outline: 1px solid var(--background-modifier-border);
	}

	.translator-table tbody {
		background-color: var(--background-primary);
	}

	.translator-table td {
		outline: 0 solid hsla(var(--interactive-accent-hsl), 0.55);
		transition: outline-width 0.12s cubic-bezier(0.42, 0.11, 0.76, 0.79),
					border-radius 0.15s ease-in-out;
	}

	.translator-table-wide-col {
		width: 40%;
	}

	.translator-table-empty-col {
		width: 1%;
		white-space: nowrap;
	}

	.translator-table td:focus {
		position: sticky;
		line-height: 195%;
	}

	.translator-table td:focus:after {
		position: absolute;
		content: "";
		width: 100%;
		height: 100%;
		outline-offset: -2px;
		top: 0;
		left: 0;
		outline: 3px solid hsla(var(--interactive-accent-hsl), 0.55);
		border-radius: 5px;
		/*transition: outline-width 0.12s cubic-bezier(0.42, 0.11, 0.76, 0.79);*/
	}

	.translator-table th {
		position: sticky;
		top: 0;
		background-color: var(--background-secondary);
		font-weight: bold;
		text-align: center;
		border-top: unset;
	}

	.translator-table th:hover {
		cursor: pointer;
	}

	.translator-table thead tr {
		z-index: 10;
	}

	.translator-table th:first-of-type {
		border-top-left-radius: 6px;
		border-left: unset
	}
	.translator-table td:first-of-type {
		border-left: unset;
	}

	.translator-table th:last-of-type {
		border-right: unset;
	}

	.translator-table tr:last-of-type td {
		border-bottom: unset;
	}

	.translator-table tr:last-of-type td:first-of-type {
		border-bottom-left-radius: 6px;
	}

	.translator-table tr:last-of-type td:last-of-type {
		border-right: unset;
	}

	.translator-table tr:last-child {
		position: sticky;
		bottom: 0;
		background-color: var(--background-secondary);
	}

	.translator-table-cell-temporary {
		color: var(--text-faint);
		font-style: italic;
	}

	.translator-table-cell-temporary td:first-of-type:empty:not(:focus):before {
		content: "Type here...";
	}

	.translator-table-cell-header {
		display: flex;
		justify-content: center;
		height: 18px;
	}

	.translator-table-cell-header-icon {
		position: absolute;
		right: 0;
		margin-right: var(--size-4-2);
	}

	.translator-filter-input-icon {
		position: absolute;
		cursor: pointer;
		right: 7px;
		top: 7px;
	}

	.translator-filter-input {
		margin: var(--size-2-3) 0 var(--size-4-2) auto;
		position: relative;
		width: fit-content;
	}

	.translator-filter-input input {
		background-color: var(--background-primary-alt);
	}

	
</style>
