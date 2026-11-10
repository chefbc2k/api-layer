pragma solidity 0.4.26;
// Disposable test fixture, never deploy as the production marketplace.
interface Token { function transferFrom(address,address,uint256) external returns(bool); }
contract FundingPurchaseHarness {
 address public getUsdcToken;
 address public seller;
 address public assetOwner;
 uint256 public price;
 bool public active=true;
 event AssetPurchased(uint256 indexed tokenId,address indexed seller,address indexed buyer,uint256 price);
 constructor(address token,address initialSeller,uint256 initialPrice) public {getUsdcToken=token;seller=initialSeller;price=initialPrice;assetOwner=address(this);}
 function getListing(uint256 id) external view returns(uint256,address,uint256,uint256,uint256,uint256,uint256,bool){return(id,seller,price,0,0,0,0,active);}
 function ownerOf(uint256) external view returns(address){return assetOwner;}
 function getOriginalOwner(uint256) external view returns(address){return seller;}
 function isInEscrow(uint256) external view returns(bool){return active;}
 function isPaused() external pure returns(bool){return false;}
 function paymentPaused() external pure returns(bool){return false;}
 function changePrice(uint256 next) external {require(msg.sender==seller);price=next;}
 function purchaseAsset(uint256 tokenId) external {require(active && msg.sender!=seller);require(Token(getUsdcToken).transferFrom(msg.sender,seller,price));active=false;assetOwner=msg.sender;emit AssetPurchased(tokenId,seller,msg.sender,price);}
}
