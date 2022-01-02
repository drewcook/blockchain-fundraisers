import { Box, CircularProgress } from '@mui/material'

const styles = {
	wrapper: {
		width: '100vw',
		height: '100vh',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
	},
	spinner: {
		marginX: 'auto',
		marginY: 4,
	},
}

const FullPageLoading = () => (
	<Box sx={styles.wrapper}>
		<CircularProgress size={50} sx={styles.spinner} />
	</Box>
)

export default FullPageLoading
