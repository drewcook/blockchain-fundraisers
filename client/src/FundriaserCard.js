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
	FilledInput,
	FormControl,
	InputAdornment,
	InputLabel,
	Typography,
} from '@mui/material'
import CryptoCompare from 'cryptocompare'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import FundraiserContract from './contracts/Fundraiser.json'

const styles = {
	container: {},
	card: {},
	media: {
		width: '100%',
		height: 'auto',
		backgroundColor: '#333',
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
			donationsList.push({ donationAmount: userDonation.toFixed(2), date: donationDate })
		}

		return donationsList.map(donation => (
			<Box
				sx={{ marginY: 3, display: 'flex', justifyContent: 'space-between' }}
				key={donation.date}
			>
				<p>${donation.donationAmount}</p>
				<Button variant="outlined" color="primary" size="small">
					<Link
						className="donation-receipt-link"
						to="/receipts"
						state={{
							donation: donation.donationAmount,
							date: donation.date,
							fundName: fund.name,
						}}
					>
						Request Receipt
					</Link>
				</Button>
			</Box>
		))
	}

	const FundraiserDialog = () => (
		<Dialog
			open={open}
			onClose={handleClose}
			aria-labelledby="fundraiser-dialog-title"
			fullWidth
			maxWidth="sm"
		>
			<DialogTitle id="fundraiser-dialog-title">Donate to {fund.name}</DialogTitle>
			<DialogContent>
				<CardMedia
					sx={styles.media}
					component="img"
					image={fund.imageURL}
					title="Fundraiser Image"
				/>
				<DialogContentText sx={{ marginY: 3 }}>{fund.description}</DialogContentText>
				<FormControl variant="filled" fullWidth margin="normal">
					<InputLabel htmlFor="fundraiser-donation-amount">Donation Amount</InputLabel>
					<FilledInput
						fullWidth
						id="fundraiser-donation-amount"
						value={donationAmount}
						placeholder="0.00"
						onChange={e => handleDonationChange(e)}
						startAdornment={<InputAdornment position="start">$</InputAdornment>}
					/>
					<Typography sx={{ marginTop: 1 }} className="small-eth">
						({donationAmountEth} ETH)
					</Typography>
				</FormControl>
				<Box>
					<Typography variant="h6">My Donations</Typography>
					{displayMyDonations()}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} color="primary">
					Cancel
				</Button>
				<Button onClick={handleDonate} variant="contained" color="primary">
					Donate
				</Button>
			</DialogActions>
		</Dialog>
	)

	return (
		<Box sx={styles.container}>
			<Card sx={styles.card}>
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
						<Typography
							gutterBottom
							variant="body2"
							color="textSecondary"
							component="p"
							sx={{ marginBottom: 3 }}
						>
							{fund.description?.substring(0, 240) + '...'}
						</Typography>
						<Typography variant="h5" color="textSecondary" component="p">
							Amount Raised: ${fund.donationAmountUSD?.toFixed(2)}
							<span className="small-eth">({fund.donationAmountETH} ETH)</span>
						</Typography>
						<Typography variant="h6" color="textSecondary" component="p">
							Total Donations: {fund.donationsCount}
						</Typography>
					</CardContent>
				</CardActionArea>
				<CardActions sx={{ justifyContent: 'flex-end', padding: 3 }}>
					<Button variant="contained" color="info" onClick={handleOpen}>
						View More
					</Button>
				</CardActions>
				{FundraiserDialog()}
			</Card>
		</Box>
	)
}

export default FundraiserCard
