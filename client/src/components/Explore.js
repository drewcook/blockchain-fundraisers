import { Box, CircularProgress, Grid, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import FundriaserCard from './FundriaserCard'
import Notification from './Notification'

const styles = {
	centered: {
		textAlign: 'center',
	},
	spinner: {
		marginX: 'auto',
		marginY: 4,
	},
}

const Explore = props => {
	const { appData } = props
	const [fundraisers, setFundraisers] = useState([])
	const [totalCount, setTotalCount] = useState(null)
	const [loading, setLoading] = useState(true)
	const [errorMsg, setErrorMsg] = useState(null)
	const [successOpen, setSuccessOpen] = useState(false)
	const [successMsg, setSuccessMsg] = useState('')

	/* eslint-disable react-hooks/exhaustive-deps */
	useEffect(() => {
		init()
	}, [])

	useEffect(() => {
		init()
	}, [appData])

	useEffect(() => {
		displayContent()
	}, [loading, errorMsg, fundraisers])
	/* eslint-enable react-hooks/exhaustive-deps */

	const init = async () => {
		try {
			if (appData.factory) fetchFundraisers()
		} catch (err) {
			console.error('Init Error:', err.message)
		}
	}

	const fetchFundraisers = async () => {
		setLoading(true)
		setErrorMsg(null)
		try {
			const newFunds = await appData.factory.methods.fundraisers(10, 0).call()
			const newCount = await appData.factory.methods.fundraisersCount().call()
			setFundraisers(newFunds)
			setTotalCount(newCount)
			setLoading(false)
		} catch (err) {
			console.error(err.message)
			setLoading(false)
			setErrorMsg('An error occurred while fetching fundraisers. Please check console.')
		}
	}

	const onFundActionSuccess = msg => {
		fetchFundraisers()
		setSuccessOpen(true)
		setSuccessMsg(msg)
		setTimeout(() => {
			setSuccessOpen(false)
			setSuccessMsg('')
		}, 5500)
	}

	const displayContent = () => {
		if (loading)
			return (
				<Grid item xs={12} sx={styles.centered}>
					<CircularProgress size={30} sx={styles.spinner} />
				</Grid>
			)

		if (errorMsg)
			return (
				<Grid item xs={12}>
					<Typography gutterBottom color="error" sx={styles.centered}>
						{errorMsg}
					</Typography>
				</Grid>
			)

		if (fundraisers.length > 0)
			return fundraisers.map((fund, idx) => (
				<Grid item xs={12} sm={6} lg={4} key={idx}>
					<FundriaserCard fundraiser={fund} appData={appData} onSuccess={onFundActionSuccess} />
				</Grid>
			))

		return (
			<Grid item xs={12}>
				<Typography gutterBottom variant="overline">
					No fundraisers created yet.
				</Typography>
			</Grid>
		)
	}

	return (
		<>
			<Box sx={styles.centered}>
				<Typography gutterBottom variant="h2">
					Explore Fundraisers
					{totalCount && (
						<Typography gutterBottom>
							There are currently <strong>{totalCount}</strong> total fundraisers that you may
							donate to.
						</Typography>
					)}
				</Typography>
			</Box>
			<Grid container spacing={2}>
				{displayContent()}
			</Grid>
			{successOpen && <Notification open={successOpen} msg={successMsg} type="success" />}
		</>
	)
}

export default Explore
