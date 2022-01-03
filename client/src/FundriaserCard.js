import {
	Box,
	Button,
	Card,
	CardActionArea,
	CardActions,
	CardContent,
	CardMedia,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	FilledInput,
	FormControl,
	InputAdornment,
	InputLabel,
	Typography,
} from '@mui/material'
import CryptoCompare from 'cryptocompare'
import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FundraiserContract from './contracts/Fundraiser.json'
import formatNumber from './utils/formatNumber'

const styles = {
	media: {
		width: '100%',
		backgroundColor: '#333',
		height: 300,
		borderBottom: '1px solid #ccc',
	},
	viewMoreBtn: {
		justifyContent: 'flex-end',
		padding: 3,
	},
	verticalSpacing: {
		marginY: 3,
	},
	ethAmount: {
		fontWeight: 500,
		fontSize: '0.9rem',
		color: '#a1a1a1',
	},
	donationRow: {
		paddingY: 3,
		display: 'flex',
		justifyContent: 'space-between',
	},
}

const FundraiserCard = props => {
	const { appData, fundraiser, onDonate } = props
	const [contract, setContract] = useState(null)
	const [open, setOpen] = useState(false)
	const [exchangeRate, setExchangeRate] = useState(1)
	const [donationAmount, setDonationAmount] = useState('')
	const [donationAmountEth, setDonationAmountEth] = useState(0)
	const [fund, setFund] = useState({
		name: null,
		description: null,
		imageURL: null,
		url: null,
		donationsCount: null,
		donationAmountETH: null,
		donationAmountUSD: null,
	})
	const [userDonations, setUserDonations] = useState(null)
	const [isOwner, setIsOwner] = useState(false)
	const [beneficiary, setNewBeneficiary] = useState('')

	const init = async () => {
		try {
			// Get contract for given fundraiser contract address
			const instance = new appData.web3.eth.Contract(FundraiserContract.abi, fundraiser)
			setContract(instance)
			// Read contract data and construct fundraiser data
			const name = await instance.methods.name().call()
			const description = await instance.methods.description().call()
			const imageURL = await instance.methods.imageURL().call()
			const url = await instance.methods.url().call()
			// Donations
			const donationsCount = await instance.methods.donationsCount().call()
			const donationAmount = await instance.methods.totalDonations().call()
			const donationAmountETH = await appData.web3.utils.fromWei(donationAmount, 'ether')
			// Get exchange rate from API
			const xRate = await CryptoCompare.price('ETH', ['USD'])
			setExchangeRate(xRate)
			const donationAmountUSD = xRate.USD * donationAmountETH
			setFund({
				name,
				description,
				imageURL,
				url,
				donationsCount,
				donationAmountETH,
				donationAmountUSD,
			})
			// User donations
			const myDonations = await instance.methods.myDonations().call({ from: appData.accounts[0] })
			setUserDonations(myDonations)

			// Set owner
			const userAcct = appData.accounts[0]
			const ownerAcct = await instance.methods.owner().call()
			if (userAcct === ownerAcct) {
				setIsOwner(true)
			}
		} catch (err) {}
	}

	/* eslint-disable react-hooks/exhaustive-deps */
	useEffect(() => {
		if (fundraiser) init(fundraiser)
	}, [fundraiser])
	/* eslint-enable react-hooks/exhaustive-deps */

	const handleOpen = () => {
		setOpen(true)
	}

	const handleClose = () => {
		setOpen(false)
	}

	const handleDonationChange = e => {
		const value = e.target.value
		const ethValue = value / exchangeRate.USD || 0
		setDonationAmount(value)
		setDonationAmountEth(ethValue)
	}

	const handleDonate = async () => {
		const ethAmount = donationAmount / exchangeRate.USD || 0
		const donation = appData.web3.utils.toWei(ethAmount.toString())

		await contract.methods.donate().send({
			from: appData.accounts[0],
			value: donation,
			gas: 650000,
		})
		onDonate()
		handleClose()
	}

	const handleWithdrawal = async () => {
		await contract.methods.withdraw().send({
			from: appData.accounts[0],
		})

		alert('Funds Withdrawn!')
	}

	const handleSetBeneficiary = async () => {
		await contract.methods.setBeneficiary(beneficiary).send({
			from: appData.accounts[0],
		})

		alert('Fundraiser beneficiary has been changed!')
	}

	const displayMyDonations = () => {
		const donations = userDonations
		if (donations === null) return null

		// Construct donations list
		const totalDonations = donations.values.length
		let donationsList = []
		for (let i = 0; i < totalDonations; i++) {
			const ethAmount = appData.web3.utils.fromWei(donations.values[i])
			const userDonation = exchangeRate.USD * ethAmount
			const donationDate = donations.dates[i]
			donationsList.push({
				donationAmountUSD: formatNumber(userDonation),
				donationAmountETH: ethAmount,
				date: donationDate,
			})
		}

		return donationsList.map(donation => (
			<Fragment key={donation.date}>
				<Box sx={styles.donationRow}>
					<Box>
						<Typography>${donation.donationAmountUSD}</Typography>
						<Typography sx={styles.ethAmount}>({donation.donationAmountETH} ETH)</Typography>
					</Box>
					<Link
						className="donation-receipt-link"
						to="/receipts"
						state={{
							donation: donation.donationAmount,
							date: donation.date,
							fundName: fund.name,
						}}
					>
						<Button variant="outlined" color="primary" size="small">
							Request Receipt
						</Button>
					</Link>
				</Box>
				<Divider light />
			</Fragment>
		))
	}

	const FundraiserDialog = () => (
		<Dialog
			open={open}
			onClose={handleClose}
			aria-labelledby="fundraiser-dialog-title"
			fullWidth
			maxWidth="md"
		>
			<DialogTitle id="fundraiser-dialog-title">Details - {fund.name}</DialogTitle>
			<DialogContent dividers>
				<CardMedia
					sx={styles.media}
					component="img"
					image={fund.imageURL}
					title="Fundraiser Image"
				/>
				<DialogContentText sx={styles.verticalSpacing}>{fund.description}</DialogContentText>
				<Divider />
				<Box sx={styles.verticalSpacing}>
					<Typography variant="h6">Make a Donation</Typography>
					<FormControl variant="filled" fullWidth margin="normal">
						<InputLabel htmlFor="donation-amount-input">Donation Amount</InputLabel>
						<FilledInput
							id="donation-amount-input"
							value={donationAmount}
							placeholder="0.00"
							onChange={e => handleDonationChange(e)}
							startAdornment={<InputAdornment position="start">$</InputAdornment>}
							fullWidth
						/>
					</FormControl>
					<Typography sx={styles.ethAmount}>({donationAmountEth} ETH)</Typography>
					<Button onClick={handleDonate} variant="contained" color="primary" sx={{ marginY: 1 }}>
						Donate
					</Button>
				</Box>
				<Divider />
				<Box sx={styles.verticalSpacing}>
					<Typography variant="h6">My Donations</Typography>
					{displayMyDonations()}
				</Box>
				{isOwner && (
					<>
						<Typography variant="h5">Owner Actions</Typography>
						<Typography gutterBottom>
							As the owner of this fundraiser, you have a couple actions available to perform.
						</Typography>
						<Box sx={styles.verticalSpacing}>
							<Typography variant="h6">Set Beneficiary</Typography>
							<Typography>
								Set a new beneficiary wallet address for this fundraiser. The beneficiary wallet
								will receive all of the funds when withdrawn.
							</Typography>
							<FormControl variant="filled" fullWidth margin="normal">
								<InputLabel htmlFor="set-beneficiary-input">Beneficiary ETH Address</InputLabel>
								<FilledInput
									id="set-beneficiary-input"
									value={beneficiary}
									placeholder="0x0000000000000000000000000000000000000000"
									onChange={e => setNewBeneficiary(e.target.value)}
									fullWidth
								/>
							</FormControl>
							<Button variant="contained" color="secondary" onClick={handleSetBeneficiary}>
								Set Beneficiary
							</Button>
						</Box>
						<Box sx={styles.verticalSpacing}>
							<Typography variant="h6">Withdraw Funds</Typography>
							<Typography gutterBottom>
								You may withdraw all of the funds currently tied to this fundraiser. The funds will
								be directly deposited into the beneficiary's wallet.
							</Typography>
							<Button variant="contained" color="secondary" onClick={handleWithdrawal}>
								Withdrawal
							</Button>
						</Box>
					</>
				)}
				<Box sx={styles.verticalSpacing} />
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} color="primary">
					Close
				</Button>
			</DialogActions>
		</Dialog>
	)

	return (
		<Card>
			<CardActionArea onClick={handleOpen}>
				<CardMedia
					sx={styles.media}
					component="img"
					image={fund.imageURL}
					title="Fundraiser Image"
				/>
				<CardContent>
					<Typography gutterBottom variant="h5" component="h2">
						{fund.name}
					</Typography>
					{/* <Typography
							gutterBottom
							variant="body2"
							color="textSecondary"
							component="p"
							sx={{ marginBottom: 3 }}
						>
							{fund.description?.substring(0, 50) + '...'}
						</Typography> */}
					<Typography variant="h5" color="textSecondary" component="p">
						Amount Raised: ${formatNumber(fund.donationAmountUSD)}
					</Typography>
					<Typography sx={styles.ethAmount}>({fund.donationAmountETH} ETH)</Typography>
					<Typography variant="h6" color="textSecondary" component="p">
						Total Donations: {fund.donationsCount}
					</Typography>
				</CardContent>
			</CardActionArea>
			<CardActions sx={styles.viewMoreBtn}>
				<Button variant="contained" color="info" onClick={handleOpen}>
					View Details
				</Button>
			</CardActions>
			{FundraiserDialog()}
		</Card>
	)
}

export default FundraiserCard
