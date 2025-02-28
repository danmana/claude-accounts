import React, {useState, useEffect} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';

export default function App() {
	const {exit} = useApp();
	const [accounts, setAccounts] = useState([]);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [selectedAccount, setSelectedAccount] = useState(null);
	const [message, setMessage] = useState(null);
	const [accountSwitched, setAccountSwitched] = useState(false);

	useEffect(() => {
		async function loadAccounts() {
			try {
				const configPath = path.join(os.homedir(), '.claude.json');
				const data = await fs.readFile(configPath, 'utf8');
				const config = JSON.parse(data);

				if (!config.__ext__accounts || !Array.isArray(config.__ext__accounts)) {
					config.__ext__accounts = [];
				}

				let needsUpdate = false;

				if (config.oauthAccount) {
					// Check if oauthAccount matches any account in the list
					const match = config.__ext__accounts.find(
						account =>
							account.oauthAccount &&
							account.oauthAccount.accountUuid ===
								config.oauthAccount.accountUuid &&
							account.oauthAccount.organizationUuid ===
								config.oauthAccount.organizationUuid,
					);

					if (match) {
						// Check if primaryApiKey is different and needs updating
						if (
							config.primaryApiKey &&
							match.primaryApiKey !== config.primaryApiKey
						) {
							match.primaryApiKey = config.primaryApiKey;
							needsUpdate = true;
						}
						setSelectedAccount(match);
					} else if (
						config.oauthAccount.accountUuid &&
						config.oauthAccount.organizationUuid
					) {
						// If the oauth account exists but isn't in the accounts list, add it
						const newAccount = {
							oauthAccount: {
								...config.oauthAccount,
							},
							// Add a name from the email or a default
							name: config.oauthAccount.emailAddress
								? `${
										config.oauthAccount.emailAddress
								  } (org: ${config.oauthAccount.organizationUuid.slice(0, 8)})`
								: `Account ${config.oauthAccount.accountUuid.slice(0, 8)}`,
						};

						// Copy primaryApiKey if it exists in the config
						if (config.primaryApiKey) {
							newAccount.primaryApiKey = config.primaryApiKey;
						}

						config.__ext__accounts.push(newAccount);
						setSelectedAccount(newAccount);
						needsUpdate = true;
					}
				}

				setAccounts(config.__ext__accounts);

				// Update the config if needed
				if (needsUpdate) {
					await fs.writeFile(
						configPath,
						JSON.stringify(config, null, 2),
						'utf8',
					);
				}
			} catch (err) {
				setError(`Error loading accounts: ${err.message}`);
			} finally {
				setLoading(false);
			}
		}

		loadAccounts();
	}, []);

	const handleSelect = async item => {
		// Handle exit option
		if (item.value === 'exit') {
			exit();
			return;
		}

		// Handle login option
		if (item.value === 'login') {
			// Start the claude /login command
			spawn('claude', ['/login'], {
				stdio: 'inherit',
				detached: true,
			});
			exit();
			return;
		}

		const selectedAcc = item.value;
		setSelectedAccount(selectedAcc);

		try {
			// Read the current config to ensure we have the latest version
			const configPath = path.join(os.homedir(), '.claude.json');
			const data = await fs.readFile(configPath, 'utf8');
			const config = JSON.parse(data);

			// Check if selected account is the same as config.oauthAccount
			if (
				config.oauthAccount &&
				selectedAcc.oauthAccount &&
				config.oauthAccount.accountUuid ===
					selectedAcc.oauthAccount.accountUuid &&
				config.oauthAccount.organizationUuid ===
					selectedAcc.oauthAccount.organizationUuid
			) {
				// Do nothing, it was probably updated externally
				setMessage('Account already selected');
				return;
			}

			// Check if config.oauthAccount exists in __ext__accounts
			if (config.oauthAccount) {
				const oauthAccountExists = config.__ext__accounts.some(
					account =>
						account.oauthAccount &&
						account.oauthAccount.accountUuid ===
							config.oauthAccount.accountUuid &&
						account.oauthAccount.organizationUuid ===
							config.oauthAccount.organizationUuid,
				);

				// If not, add it to __ext__accounts
				if (
					!oauthAccountExists &&
					config.oauthAccount.accountUuid &&
					config.oauthAccount.organizationUuid
				) {
					const newAccount = {
						oauthAccount: config.oauthAccount,
						name: config.oauthAccount.emailAddress
							? `${
									config.oauthAccount.emailAddress
							  } (org: ${config.oauthAccount.organizationUuid.slice(0, 8)})`
							: `Account ${config.oauthAccount.accountUuid.slice(0, 8)}`,
					};

					// Copy primaryApiKey if it exists in the config
					if (config.primaryApiKey) {
						newAccount.primaryApiKey = config.primaryApiKey;
					}

					config.__ext__accounts.push(newAccount);
				}
			}

			// Check if the selected account already exists in __ext__accounts
			const accountExists = config.__ext__accounts.some(
				account =>
					account.oauthAccount &&
					selectedAcc.oauthAccount &&
					account.oauthAccount.accountUuid ===
						selectedAcc.oauthAccount.accountUuid &&
					account.oauthAccount.organizationUuid ===
						selectedAcc.oauthAccount.organizationUuid,
			);

			// If the account doesn't exist, add it to __ext__accounts
			if (!accountExists) {
				config.__ext__accounts.push(selectedAcc);
			}

			// Override config.oauthAccount with the values from selectedAccount
			config.oauthAccount = selectedAcc.oauthAccount;

			// Override config.primaryApiKey with the values from selectedAccount
			if (selectedAcc.primaryApiKey) {
				config.primaryApiKey = selectedAcc.primaryApiKey;
			}

			// Write the updated config back to the file
			await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

			// Display a success message with the account name or email
			const accountName =
				selectedAcc.name ||
				(selectedAcc.oauthAccount.emailAddress
					? `${
							selectedAcc.oauthAccount.emailAddress
					  } (org: ${selectedAcc.oauthAccount.organizationUuid.slice(0, 8)})`
					: 'Selected account');
			setMessage(`Successfully switched to account: ${accountName}`);
			setAccountSwitched(true);

			// Exit the app after a short delay
			setTimeout(() => {
				exit();
			}, 500);
		} catch (err) {
			setError(`Error updating accounts: ${err.message}`);
		}
	};

	// Handle escape key press - must be outside any conditional returns
	// to ensure consistent hook count between renders
	useInput((input, key) => {
		if (key.escape) {
			exit();
		}
	});

	if (loading) {
		return <Text>Loading accounts...</Text>;
	}

	if (error) {
		return <Text color="red">{error}</Text>;
	}

	// Create items for the SelectInput component
	let items = accounts.map(account => {
		// Generate key based on account data
		const key = `${account.oauthAccount.accountUuid}-${account.oauthAccount.organizationUuid}`;

		// Generate label from name or email
		const label =
			account.name ||
			(account.oauthAccount.emailAddress
				? `${
						account.oauthAccount.emailAddress
				  } (org: ${account.oauthAccount.organizationUuid.slice(0, 8)})`
				: `${account.oauthAccount.accountUuid.slice(0, 8)}...`);

		return {
			key,
			label,
			value: account,
		};
	});

	// Add login option before exit
	items.push({
		key: 'login',
		label: (
			<Text>
				add new <Text bold>(claude /login)</Text>
			</Text>
		),
		value: 'login',
	});

	// Add exit option at the end
	items.push({
		key: 'exit',
		label: (
			<Text>
				exit{' '}
				<Text bold color="#966c1e">
					(esc)
				</Text>
			</Text>
		),
		value: 'exit',
	});

	// Find the index of the selected account in the items array
	let initialIndex = -1;
	if (selectedAccount && selectedAccount.oauthAccount) {
		initialIndex = items.findIndex(
			item =>
				item.value &&
				item.value.oauthAccount &&
				item.value.oauthAccount.accountUuid ===
					selectedAccount.oauthAccount.accountUuid &&
				item.value.oauthAccount.organizationUuid ===
					selectedAccount.oauthAccount.organizationUuid,
		);
	}

	// Hook moved earlier in the component

	return (
		<Box flexDirection="column">
			{/* First Box: Header and account info */}
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="#D97757"
				padding={1}
				width={64}
			>
				<Text>
					<Text color="#D97757">✻</Text> Welcome to{' '}
					<Text bold>Claude Code</Text> account switcher!
				</Text>

				<Box marginTop={1}>
					<Text color="#666">&gt; config: ~/.claude.json</Text>
				</Box>

				{selectedAccount ? (
					<Box flexDirection="column" marginTop={1}>
						<>
							<Text>
								⏺ <Text underline>Current account:</Text>
							</Text>
							<Text color="#2c7a39">
								{selectedAccount.name ||
									(selectedAccount.oauthAccount.emailAddress
										? `${
												selectedAccount.oauthAccount.emailAddress
										  } (org: ${selectedAccount.oauthAccount.organizationUuid.slice(
												0,
												8,
										  )})`
										: `Account ${selectedAccount.oauthAccount.accountUuid.slice(
												0,
												8,
										  )}`)}
							</Text>
							<Text color="#666">
								Account UUID: {selectedAccount.oauthAccount.accountUuid}
							</Text>
							<Text color="#666">
								Organization UUID:{' '}
								{selectedAccount.oauthAccount.organizationUuid}
							</Text>
						</>
					</Box>
				) : (
					<Text color="#966c1e" marginTop={1}>
						No account selected
					</Text>
				)}
			</Box>

			{/* Second Box: Account selection */}
			<Box
				flexDirection="column"
				marginTop={1}
				borderStyle="round"
				borderColor="gray"
				padding={1}
			>
				<Text>
					{selectedAccount
						? 'Select a different account:'
						: 'Select an account:'}
				</Text>

				{accounts.length === 0 ? (
					<Text>No accounts found</Text>
				) : (
					<SelectInput
						items={items}
						onSelect={handleSelect}
						initialIndex={initialIndex >= 0 ? initialIndex : undefined}
					/>
				)}
			</Box>

			{/* Success message */}
			{message && (
				<Box marginTop={1}>
					<Text color="#2c7a39">{message}</Text>
				</Box>
			)}

			{/* Instructions for restarting terminals */}
			{accountSwitched && (
				<Box marginTop={1}>
					<Text color="#D97757">
						Close and re-open any <Text bold>Claude Code</Text> terminals to
						apply changes!
					</Text>
				</Box>
			)}
		</Box>
	);
}
